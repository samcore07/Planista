import { BudgetCalculationResult, roundCurrency, calculateExpenseBalance } from "./budget.service";
import { TaskItem, TaskDependency, TimelineService } from "./timeline.service";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface EvaluatedRisk {
  id?: string;
  eventId: string;
  title: string;
  severity: RiskSeverity;
  category: "budget" | "timeline" | "vendor" | "venue" | "payment" | "planning";
  explanation: string;
  supportingFacts: string[];
  mitigationAction: string;
  affectedResources?: string[];
  source?: "deterministic" | "ai_recommendation";
  isResolved: boolean;
}

export interface VenueCapacityInfo {
  venueName?: string;
  maxCapacity?: number;
}

export interface VendorSummaryItem {
  id: string;
  name: string;
  category: string;
  status: "inquiry" | "quoted" | "contracted" | "declined";
}

export interface ExpensePaymentItem {
  id: string;
  title: string;
  actualAmount: number;
  depositPaid: number;
  dueDate: string | null;
  paymentStatus: "unpaid" | "deposit_paid" | "fully_paid";
}

export class RiskService {
  /**
   * Deterministically evaluates event data to generate explainable risks.
   * Grounded strictly in factual event state.
   */
  static evaluate(
    eventId: string,
    budgetMetrics: BudgetCalculationResult,
    tasks: TaskItem[],
    dependencies: TaskDependency[],
    vendors: VendorSummaryItem[],
    expenses: ExpensePaymentItem[],
    referenceDate: Date = new Date()
  ): EvaluatedRisk[] {
    const risks: EvaluatedRisk[] = [];

    // 1. Budget Overrun Risk
    if (budgetMetrics.isOverBudget) {
      risks.push({
        eventId,
        title: "Total Budget Overrun Detected",
        severity: "critical",
        category: "budget",
        explanation: `Actual event expenses have exceeded total planned budget by ₹${budgetMetrics.overspendAmount.toFixed(2)}.`,
        supportingFacts: [
          `Total Budget: ₹${budgetMetrics.totalBudget.toFixed(2)}`,
          `Actual Committed Expenses: ₹${budgetMetrics.totalActual.toFixed(2)}`,
          `Overspend Amount: ₹${budgetMetrics.overspendAmount.toFixed(2)}`,
        ],
        mitigationAction:
          "Review category line items with overages or negotiate lower vendor quote terms to bring total expenses within the authorized cap.",
        affectedResources: ["Total Event Budget"],
        source: "deterministic",
        isResolved: false,
      });
    }

    // 2. Individual Category Budget Overruns
    for (const cat of budgetMetrics.categories) {
      if (cat.isOverBudget && cat.allocatedAmount > 0) {
        risks.push({
          eventId,
          title: `Category Budget Exceeded: ${cat.categoryName}`,
          severity: "high",
          category: "budget",
          explanation: `Expenses for "${cat.categoryName}" exceed the allocated budget by ₹${Math.abs(cat.varianceAmount).toFixed(2)} (${cat.percentUtilized.toFixed(0)}% utilized).`,
          supportingFacts: [
            `Allocated: ₹${cat.allocatedAmount.toFixed(2)}`,
            `Actual: ₹${cat.actualAmount.toFixed(2)}`,
          ],
          mitigationAction: `Reallocate surplus funds from an under-utilized category or reduce non-essential scope in ${cat.categoryName}.`,
          affectedResources: [cat.categoryName],
          source: "deterministic",
          isResolved: false,
        });
      }
    }

    // 3. Timeline & Schedule Analysis
    const timelineAnalysis = TimelineService.analyzeTimeline(tasks, dependencies, referenceDate);

    // Overdue tasks
    if (timelineAnalysis.overdueTasks.length > 0) {
      const overdueTitles = timelineAnalysis.overdueTasks.slice(0, 3).map((t) => t.title);
      const isCritical = timelineAnalysis.overdueTasks.some(
        (t) => t.priority === "critical" || t.priority === "high"
      );

      risks.push({
        eventId,
        title: `${timelineAnalysis.overdueTasks.length} Overdue Task(s) Behind Schedule`,
        severity: isCritical ? "high" : "medium",
        category: "timeline",
        explanation: `There are ${timelineAnalysis.overdueTasks.length} uncompleted task(s) whose due dates have elapsed.`,
        supportingFacts: [
          `Overdue items include: ${overdueTitles.join(", ")}${
            timelineAnalysis.overdueTasks.length > 3 ? "..." : ""
          }`,
        ],
        mitigationAction:
          "Re-evaluate task priorities or trigger automated schedule propagation to recalculate realistic completion targets.",
        affectedResources: overdueTitles,
        source: "deterministic",
        isResolved: false,
      });
    }

    // Blocked tasks
    if (timelineAnalysis.blockedTasks.length > 0) {
      const blockedTitles = timelineAnalysis.blockedTasks.map((t) => t.title).slice(0, 3);
      risks.push({
        eventId,
        title: `${timelineAnalysis.blockedTasks.length} Blocked Task(s) Waiting on Dependencies`,
        severity: "medium",
        category: "timeline",
        explanation: `Several tasks cannot commence because prerequisite dependencies remain incomplete.`,
        supportingFacts: [
          `Blocked tasks: ${blockedTitles.join(", ")}`,
        ],
        mitigationAction:
          "Accelerate completion of bottleneck prerequisite tasks to unblock downstream workflow.",
        affectedResources: blockedTitles,
        source: "deterministic",
        isResolved: false,
      });
    }

    // Circular dependencies
    if (TimelineService.detectCycle(dependencies)) {
      risks.push({
        eventId,
        title: "Conflicting Circular Task Dependency Detected",
        severity: "critical",
        category: "timeline",
        explanation: "Two or more tasks depend on each other in an infinite prerequisite loop.",
        supportingFacts: ["Circular graph cycle identified in task dependencies table"],
        mitigationAction:
          "Break the cyclical dependency by detaching the circular predecessor relationship.",
        affectedResources: ["Dependency Graph"],
        source: "deterministic",
        isResolved: false,
      });
    }

    // 4. Missing Critical Vendors Check (e.g. Venue & Catering)
    const hasContractedVenue = vendors.some(
      (v) =>
        v.category.toLowerCase().includes("venue") &&
        (v.status === "contracted" || v.status === "quoted")
    );
    if (!hasContractedVenue && tasks.length > 0) {
      risks.push({
        eventId,
        title: "No Contracted or Quoted Venue On Record",
        severity: "high",
        category: "vendor",
        explanation: "Venue booking is critical to establishing event capacity, schedule anchors, and vendor logistics.",
        supportingFacts: ["No venue record with 'quoted' or 'contracted' status in vendor registry"],
        mitigationAction:
          "Prioritize venue shortlisting and secure a written quotation to finalize date and guest capacity constraints.",
        affectedResources: ["Venue Category"],
        source: "deterministic",
        isResolved: false,
      });
    }

    // 5. Unresolved Payments Due Soon (within 7 days)
    const nowMs = referenceDate.getTime();
    const sevenDaysMs = nowMs + 7 * 24 * 60 * 60 * 1000;

    const urgentPaymentsWithBalances = expenses.map((exp) => ({
      expense: exp,
      balance: calculateExpenseBalance(exp.actualAmount, exp.depositPaid, exp.paymentStatus),
    }));

    const urgentPayments = urgentPaymentsWithBalances.filter(({ expense: exp, balance }) => {
      if (balance.isFullyPaid || !exp.dueDate) return false;
      const dueMs = new Date(exp.dueDate).getTime();
      if (Number.isNaN(dueMs)) return false;
      return dueMs >= nowMs && dueMs <= sevenDaysMs && balance.outstandingBalance > 0;
    });

    if (urgentPayments.length > 0) {
      const totalUrgent = roundCurrency(
        urgentPayments.reduce((sum, item) => roundCurrency(sum + item.balance.outstandingBalance), 0)
      );
      risks.push({
        eventId,
        title: `Upcoming Payment Deadline: ₹${totalUrgent.toFixed(2)} Due Within 7 Days`,
        severity: "high",
        category: "payment",
        explanation: `${urgentPayments.length} vendor expense(s) have impending payment milestones within the next 7 days.`,
        supportingFacts: urgentPayments.map(
          ({ expense: p, balance }) =>
            `${p.title}: ₹${balance.outstandingBalance.toFixed(2)} due on ${p.dueDate}`
        ),
        mitigationAction:
          "Verify funds availability and initiate vendor deposits/disbursements prior to the deadline to avoid service cancellation.",
        affectedResources: urgentPayments.map(({ expense: p }) => p.title),
        source: "deterministic",
        isResolved: false,
      });
    }

    // 6. Missing Contingency Reserve Buffer Check
    const hasContingency = budgetMetrics.categories.some(
      (c) =>
        c.categoryName.toLowerCase().includes("contingency") ||
        c.categoryName.toLowerCase().includes("reserve") ||
        c.categoryName.toLowerCase().includes("buffer")
    );
    if (!hasContingency && budgetMetrics.totalBudget > 0) {
      risks.push({
        eventId,
        title: "Missing Contingency Reserve Allocation",
        severity: "medium",
        category: "budget",
        explanation:
          "No dedicated contingency reserve category was identified. Events typically incur 5-10% in unforeseen logistical expenses.",
        supportingFacts: ["Zero allocation designated for unforeseen overruns or emergency vendor fees"],
        mitigationAction:
          "Establish a 5% to 10% contingency allocation line item before committing discretionary decor or entertainment budgets.",
        affectedResources: ["Budget Categories"],
        source: "deterministic",
        isResolved: false,
      });
    }

    return risks;
  }
}
