import { describe, it, expect } from "vitest";
import { RiskService, VendorSummaryItem, ExpensePaymentItem } from "../risk.service";
import { BudgetService } from "../budget.service";
import { TaskItem } from "../timeline.service";

describe("RiskService & Radar Engine", () => {
  const refDate = new Date("2026-10-27T00:00:00Z");

  it("detects critical budget overruns", () => {
    const budgetMetrics = BudgetService.calculate(
      30000,
      100,
      [{ id: "c1", eventId: "e1", name: "Venue", allocatedAmount: 30000 }],
      [
        {
          id: "exp1",
          eventId: "e1",
          categoryId: "c1",
          title: "Venue Hire",
          estimatedAmount: 30000,
          actualAmount: 35000, // $5,000 overspend
          depositPaid: 10000,
          dueDate: null,
          paymentStatus: "deposit_paid",
        },
      ]
    );

    const risks = RiskService.evaluate("e1", budgetMetrics, [], [], [], [], refDate);
    const budgetOverrun = risks.find((r) => r.category === "budget" && r.severity === "critical");

    expect(budgetOverrun).toBeDefined();
    expect(budgetOverrun?.explanation).toContain("$5000.00");
  });

  it("identifies missing critical venue vendor", () => {
    const budgetMetrics = BudgetService.calculate(20000, 50, [], []);
    const tasks: TaskItem[] = [
      {
        id: "t1",
        eventId: "e1",
        title: "Book Venue",
        description: null,
        dueDate: "2026-11-01T00:00:00Z",
        priority: "critical",
        status: "pending",
        assignee: null,
        category: "Venue",
        estimatedDurationHours: 1,
      },
    ];

    // No contracted venue in vendors array
    const vendors: VendorSummaryItem[] = [
      { id: "v1", name: "DJ Mike", category: "Music", status: "contracted" },
    ];

    const risks = RiskService.evaluate("e1", budgetMetrics, tasks, [], vendors, [], refDate);
    const venueRisk = risks.find((r) => r.title.includes("No Contracted or Quoted Venue"));

    expect(venueRisk).toBeDefined();
    expect(venueRisk?.severity).toBe("high");
  });

  it("identifies urgent payment deadlines within 7 days", () => {
    const budgetMetrics = BudgetService.calculate(20000, 50, [], []);
    const expenses: ExpensePaymentItem[] = [
      {
        id: "exp-1",
        title: "Catering 2nd Deposit",
        actualAmount: 5000,
        depositPaid: 2000,
        dueDate: "2026-10-30", // 3 days from refDate (2026-10-27)
        paymentStatus: "deposit_paid",
      },
    ];

    const risks = RiskService.evaluate("e1", budgetMetrics, [], [], [], expenses, refDate);
    const paymentRisk = risks.find((r) => r.category === "payment");

    expect(paymentRisk).toBeDefined();
    expect(paymentRisk?.severity).toBe("high");
    expect(paymentRisk?.supportingFacts[0]).toContain("$3000.00 due on 2026-10-30");
  });
});
