import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { EventsDAL } from "@/lib/dal/events.dal";
import { BudgetDAL } from "@/lib/dal/budget.dal";
import { TasksDAL } from "@/lib/dal/tasks.dal";
import { VendorsDAL } from "@/lib/dal/vendors.dal";
import { RiskDAL } from "@/lib/dal/risk.dal";
import { BudgetService, BudgetCalculationResult } from "./budget.service";
import { TimelineService, TimelineAnalysisResult } from "./timeline.service";
import { RiskService, EvaluatedRisk, VendorSummaryItem } from "./risk.service";
import { IdempotencyGuard } from "@/lib/idempotency";

function toVendorStatus(raw: string | null | undefined): "inquiry" | "quoted" | "contracted" | "declined" {
  switch (raw) {
    case "quoted":
    case "contracted":
    case "declined":
      return raw;
    default:
      return "inquiry";
  }
}

function toPaymentStatus(raw: string | null | undefined): "unpaid" | "deposit_paid" | "fully_paid" {
  switch (raw) {
    case "deposit_paid":
    case "fully_paid":
      return raw;
    default:
      return "unpaid";
  }
}

function toTaskPriority(raw: string | null | undefined): "low" | "medium" | "high" | "critical" {
  switch (raw) {
    case "low":
    case "high":
    case "critical":
      return raw;
    default:
      return "medium";
  }
}

function toTaskStatus(raw: string | null | undefined): "pending" | "in_progress" | "completed" | "blocked" {
  switch (raw) {
    case "in_progress":
    case "completed":
    case "blocked":
      return raw;
    default:
      return "pending";
  }
}

function toRiskSeverity(raw: string | null | undefined): "low" | "medium" | "high" | "critical" {
  switch (raw) {
    case "medium":
    case "high":
    case "critical":
      return raw;
    default:
      return "low";
  }
}

function toRiskCategory(raw: string | null | undefined): "budget" | "timeline" | "vendor" | "venue" | "payment" {
  switch (raw) {
    case "timeline":
    case "vendor":
    case "venue":
    case "payment":
      return raw;
    default:
      return "budget";
  }
}

export interface RecalculatedEventState {
  eventId: string;
  budget: BudgetCalculationResult;
  timeline: TimelineAnalysisResult;
  risks: EvaluatedRisk[];
  recalculatedAt: string;
}

export class EventOrchestratorService {
  /**
   * Recalculates all event state derivatives in a single deterministic pipeline:
   * 1. Recomputes budget metrics (planned vs actual, remaining, cost per guest, variances)
   * 2. Flags affected/blocked/overdue tasks
   * 3. Evaluates and persists refreshed explainable risks
   * 4. Revalidates all affected route paths
   */
  static async recalculateEventState(
    eventId: string,
    options?: { idempotencyKey?: string }
  ): Promise<RecalculatedEventState> {
    if (options?.idempotencyKey && IdempotencyGuard.isDuplicate(options.idempotencyKey)) {
      // Return cached/current state without duplicate recalculation execution
      return this.getConsolidatedState(eventId);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const event = await EventsDAL.getEventById(eventId);
    if (!event) throw new Error("Event not found or access denied");

    // 1. Fetch child entities in parallel via DALs
    const [categories, expenses, tasks, dependencies, rawVendors] = await Promise.all([
      BudgetDAL.getCategories(eventId),
      BudgetDAL.getExpenses(eventId),
      TasksDAL.getTasks(eventId),
      TasksDAL.getDependencies(eventId),
      VendorsDAL.getVendors(eventId),
    ]);

    const vendors: VendorSummaryItem[] = rawVendors.map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      status: toVendorStatus(v.status),
    }));

    // 2. Compute Budget Metrics
    const budgetMetrics = BudgetService.calculate(
      Number(event.total_budget || 0),
      event.guest_count || 0,
      categories.map((c) => ({
        id: c.id,
        eventId: c.event_id,
        name: c.name,
        allocatedAmount: Number(c.allocated_amount || 0),
      })),
      expenses.map((e) => ({
        id: e.id,
        eventId: e.event_id,
        categoryId: e.category_id,
        title: e.title,
        estimatedAmount: Number(e.estimated_amount || 0),
        actualAmount: Number(e.actual_amount || 0),
        depositPaid: Number(e.deposit_paid || 0),
        dueDate: e.due_date,
        paymentStatus: toPaymentStatus(e.payment_status),
      }))
    );

    // 3. Compute Timeline Metrics & Statuses
    const taskItems = tasks.map((t) => ({
      id: t.id,
      eventId: t.event_id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      priority: toTaskPriority(t.priority),
      status: toTaskStatus(t.status),
      assignee: t.assignee,
      category: t.category,
      estimatedDurationHours: t.estimated_duration_hours ? Number(t.estimated_duration_hours) : null,
    }));

    const taskDeps = dependencies.map((d) => ({
      taskId: d.task_id,
      dependsOnTaskId: d.depends_on_task_id,
    }));

    const timelineMetrics = TimelineService.analyzeTimeline(taskItems, taskDeps);

    // 4. Evaluate Risks
    const evaluatedRisks = RiskService.evaluate(
      eventId,
      budgetMetrics,
      taskItems,
      taskDeps,
      vendors,
      expenses.map((e) => ({
        id: e.id,
        title: e.title,
        actualAmount: Number(e.actual_amount || 0),
        depositPaid: Number(e.deposit_paid || 0),
        dueDate: e.due_date,
        paymentStatus: e.payment_status as "unpaid" | "deposit_paid" | "fully_paid",
      }))
    );

    // 5. Persist Refreshed Risks to Database
    await RiskDAL.syncRisks(eventId, evaluatedRisks);

    // 6. Revalidate Cache Paths
    try {
      revalidatePath("/dashboard");
      revalidatePath(`/events/${eventId}`);
      revalidatePath(`/events/${eventId}/budget`);
      revalidatePath(`/events/${eventId}/timeline`);
      revalidatePath(`/events/${eventId}/risks`);
    } catch {
      // In non-request environments (e.g. tests), revalidatePath safely skipped
    }

    return {
      eventId,
      budget: budgetMetrics,
      timeline: timelineMetrics,
      risks: evaluatedRisks,
      recalculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves the current consolidated event state without mutating database records
   */
  static async getConsolidatedState(eventId: string): Promise<RecalculatedEventState> {
    const event = await EventsDAL.getEventById(eventId);
    if (!event) throw new Error("Event not found or access denied");

    const [categories, expenses, tasks, dependencies, risks] = await Promise.all([
      BudgetDAL.getCategories(eventId),
      BudgetDAL.getExpenses(eventId),
      TasksDAL.getTasks(eventId),
      TasksDAL.getDependencies(eventId),
      RiskDAL.getRisks(eventId),
    ]);

    const budgetMetrics = BudgetService.calculate(
      Number(event.total_budget || 0),
      event.guest_count || 0,
      categories.map((c) => ({
        id: c.id,
        eventId: c.event_id,
        name: c.name,
        allocatedAmount: Number(c.allocated_amount || 0),
      })),
      expenses.map((e) => ({
        id: e.id,
        eventId: e.event_id,
        categoryId: e.category_id,
        title: e.title,
        estimatedAmount: Number(e.estimated_amount || 0),
        actualAmount: Number(e.actual_amount || 0),
        depositPaid: Number(e.deposit_paid || 0),
        dueDate: e.due_date,
        paymentStatus: toPaymentStatus(e.payment_status),
      }))
    );

    const timelineMetrics = TimelineService.analyzeTimeline(
      tasks.map((t) => ({
        id: t.id,
        eventId: t.event_id,
        title: t.title,
        description: t.description,
        dueDate: t.due_date,
        priority: toTaskPriority(t.priority),
        status: toTaskStatus(t.status),
        assignee: t.assignee,
        category: t.category,
        estimatedDurationHours: t.estimated_duration_hours ? Number(t.estimated_duration_hours) : null,
      })),
      dependencies.map((d) => ({
        taskId: d.task_id,
        dependsOnTaskId: d.depends_on_task_id,
      }))
    );

    return {
      eventId,
      budget: budgetMetrics,
      timeline: timelineMetrics,
      risks: risks.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        title: r.title,
        severity: toRiskSeverity(r.severity),
        category: toRiskCategory(r.category),
        explanation: r.explanation,
        supportingFacts: Array.isArray(r.supporting_facts) ? (r.supporting_facts as string[]) : [],
        mitigationAction: r.mitigation_action,
        isResolved: r.is_resolved,
      })),
      recalculatedAt: new Date().toISOString(),
    };
  }
}
