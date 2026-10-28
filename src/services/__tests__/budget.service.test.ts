import { describe, it, expect } from "vitest";
import {
  BudgetService,
  roundCurrency,
  BudgetCategoryItem,
  ExpenseItem,
} from "../budget.service";

describe("BudgetService & Deterministic Currency Calculations", () => {
  it("prevents floating-point decimal inaccuracy using roundCurrency()", () => {
    // Standard JS float error: 0.1 + 0.2 === 0.30000000000000004
    const unrounded = 0.1 + 0.2;
    expect(unrounded).not.toBe(0.3);
    expect(roundCurrency(unrounded)).toBe(0.3);
  });

  it("calculates totals, category allocations, and remaining balances correctly", () => {
    const totalBudget = 50000;
    const guestCount = 200;

    const categories: BudgetCategoryItem[] = [
      { id: "cat-1", eventId: "ev-1", name: "Venue", allocatedAmount: 20000 },
      { id: "cat-2", eventId: "ev-1", name: "Catering", allocatedAmount: 18000 },
      { id: "cat-3", eventId: "ev-1", name: "Photography", allocatedAmount: 6000 },
    ];

    const expenses: ExpenseItem[] = [
      {
        id: "exp-1",
        eventId: "ev-1",
        categoryId: "cat-1",
        title: "Grand Ballroom Deposit",
        estimatedAmount: 20000,
        actualAmount: 19500,
        depositPaid: 10000,
        dueDate: "2026-11-01",
        paymentStatus: "deposit_paid",
      },
      {
        id: "exp-2",
        eventId: "ev-1",
        categoryId: "cat-2",
        title: "Plated Dinner Service",
        estimatedAmount: 18000,
        actualAmount: 18500, // $500 over category budget
        depositPaid: 5000,
        dueDate: "2026-11-15",
        paymentStatus: "deposit_paid",
      },
    ];

    const result = BudgetService.calculate(totalBudget, guestCount, categories, expenses);

    expect(result.totalBudget).toBe(50000);
    expect(result.totalAllocated).toBe(44000);
    expect(result.totalEstimated).toBe(38000);
    expect(result.totalActual).toBe(38000);
    expect(result.totalDepositsPaid).toBe(15000);
    expect(result.outstandingBalance).toBe(23000);
    expect(result.remainingUnallocated).toBe(6000); // 50000 - 44000
    expect(result.remainingUnspent).toBe(12000); // 50000 - 38000
    expect(result.costPerGuest).toBe(250); // 50000 / 200
    expect(result.isOverBudget).toBe(false);

    // Verify category breakdown
    const cateringCat = result.categories.find((c) => c.categoryId === "cat-2");
    expect(cateringCat).toBeDefined();
    expect(cateringCat?.isOverBudget).toBe(true);
    expect(cateringCat?.varianceAmount).toBe(500); // 18500 - 18000
  });

  it("identifies total budget overruns accurately", () => {
    const totalBudget = 25000;
    const categories: BudgetCategoryItem[] = [
      { id: "cat-1", eventId: "ev-1", name: "Venue", allocatedAmount: 25000 },
    ];
    const expenses: ExpenseItem[] = [
      {
        id: "exp-1",
        eventId: "ev-1",
        categoryId: "cat-1",
        title: "Venue Full Cost",
        estimatedAmount: 25000,
        actualAmount: 28000, // $3000 over total budget
        depositPaid: 10000,
        dueDate: null,
        paymentStatus: "deposit_paid",
      },
    ];

    const result = BudgetService.calculate(totalBudget, 100, categories, expenses);
    expect(result.isOverBudget).toBe(true);
    expect(result.overspendAmount).toBe(3000);
    expect(result.remainingUnspent).toBe(-3000);
  });

  it("handles 0 guest count safely without division by zero", () => {
    const cost = BudgetService.calculateCostPerGuest(30000, 0);
    expect(cost).toBe(0);
  });

  it("reconciles fully_paid expenses as 100% deposit paid with zero outstanding balance", () => {
    const categories: BudgetCategoryItem[] = [
      { id: "cat-1", eventId: "ev-1", name: "Catering", allocatedAmount: 10000 },
    ];
    const expenses: ExpenseItem[] = [
      {
        id: "exp-1",
        eventId: "ev-1",
        categoryId: "cat-1",
        title: "Wedding Cake",
        estimatedAmount: 2000,
        actualAmount: 2200,
        depositPaid: 0, // entered as 0 but marked fully paid
        dueDate: null,
        paymentStatus: "fully_paid",
      },
      {
        id: "exp-2",
        eventId: "ev-1",
        categoryId: "cat-1",
        title: "Bar Catering Retainer",
        estimatedAmount: 5000,
        actualAmount: 5000,
        depositPaid: 2000, // partially paid deposit
        dueDate: null,
        paymentStatus: "deposit_paid",
      },
    ];

    const result = BudgetService.calculate(15000, 50, categories, expenses);
    expect(result.totalActual).toBe(7200);
    // 2200 (fully paid) + 2000 (deposit) = 4200
    expect(result.totalDepositsPaid).toBe(4200);
    // 7200 - 4200 = 3000 outstanding balance left
    expect(result.outstandingBalance).toBe(3000);
  });
});
