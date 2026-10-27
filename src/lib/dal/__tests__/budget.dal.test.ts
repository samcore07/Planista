import { describe, it, expect } from "vitest";
import {
  createExpenseSchema,
  updateExpenseSchema,
  createCategorySchema,
  BudgetDAL,
  BudgetCategoryRow,
  ExpenseRow,
} from "../budget.dal";

describe("Budget DAL Schemas and Savings Intelligence", () => {
  it("validates valid expense creation input", () => {
    const input = {
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Sound & Audio Equipment",
      estimatedAmount: 2500,
      actualAmount: 2400,
      depositPaid: 1000,
      dueDate: "2026-11-15",
      paymentStatus: "deposit_paid" as const,
      notes: "Contract signed, 50% retainer due on setup",
    };

    const result = createExpenseSchema.safeParse(input);
    expect(result.success).toBe(true);

    const updateResult = updateExpenseSchema.safeParse({ actualAmount: 2600, paymentStatus: "fully_paid" });
    expect(updateResult.success).toBe(true);
  });

  it("rejects negative financial amounts in expenses", () => {
    const invalid = {
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Refund Test",
      actualAmount: -500,
    };

    const result = createExpenseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates category creation schema", () => {
    const valid = {
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Venue & Staging",
      allocatedAmount: 12000,
    };

    const result = createCategorySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("generates grounded saving proposals based on actual category allocations with explicit trade-offs", () => {
    const categories: BudgetCategoryRow[] = [
      {
        id: "cat_floral",
        event_id: "evt_1",
        name: "Floral & Decor",
        allocated_amount: 5000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "cat_catering",
        event_id: "evt_1",
        name: "Catering & Bar",
        allocated_amount: 15000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const expenses: ExpenseRow[] = [
      {
        id: "exp_1",
        event_id: "evt_1",
        category_id: "cat_floral",
        title: "Centerpieces",
        estimated_amount: 5000,
        actual_amount: 5800, // over budget
        deposit_paid: 2000,
        due_date: null,
        payment_status: "deposit_paid",
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const proposals = BudgetDAL.generateSavingsProposals(30000, categories, expenses);

    expect(proposals.length).toBeGreaterThan(0);
    for (const prop of proposals) {
      expect(prop.potentialSavings).toBeGreaterThan(0);
      expect(prop.tradeOffs.length).toBeGreaterThan(0);
      expect(prop.recommendation).toBeDefined();
    }

    // Verify overage containment proposal was flagged for the floral overrun
    const overageProp = proposals.find((p) => p.id.startsWith("over_"));
    expect(overageProp).toBeDefined();
    expect(overageProp?.potentialSavings).toBe(800);
  });
});
