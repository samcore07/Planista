import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { type Database, PaymentStatus } from "@/types/database.types";
import { z } from "zod";

export const createExpenseSchema = z.object({
  eventId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Title is required").trim(),
  estimatedAmount: z.number().min(0).default(0),
  actualAmount: z.number().min(0).default(0),
  depositPaid: z.number().min(0).default(0),
  dueDate: z.string().nullable().optional(),
  paymentStatus: z.enum(["unpaid", "deposit_paid", "fully_paid"]).default("unpaid"),
  notes: z.string().nullable().optional(),
});

export const createCategorySchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1, "Category name is required").trim(),
  allocatedAmount: z.number().min(0).default(0),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export const updateExpenseSchema = createExpenseSchema.partial().omit({ eventId: true });
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export interface SavingProposal {
  id: string;
  category: string;
  title: string;
  potentialSavings: number;
  recommendation: string;
  tradeOffs: string[];
}
export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
export type BudgetCategoryRow = Database["public"]["Tables"]["budget_categories"]["Row"];

export class BudgetDAL {
  static async getCategories(eventId: string): Promise<BudgetCategoryRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("budget_categories")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
    return data || [];
  }

  static async getExpenses(eventId: string): Promise<ExpenseRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);
    return data || [];
  }

  static async createCategory(rawInput: CreateCategoryInput): Promise<BudgetCategoryRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = createCategorySchema.parse(rawInput);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("budget_categories")
      .insert({
        event_id: input.eventId,
        name: input.name,
        allocated_amount: input.allocatedAmount,
      })
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to create category: ${error?.message}`);
    return data;
  }

  static async createExpense(rawInput: CreateExpenseInput): Promise<ExpenseRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = createExpenseSchema.parse(rawInput);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        event_id: input.eventId,
        category_id: input.categoryId ?? null,
        title: input.title,
        estimated_amount: input.estimatedAmount,
        actual_amount: input.actualAmount,
        deposit_paid: input.depositPaid,
        due_date: input.dueDate ?? null,
        payment_status: input.paymentStatus as PaymentStatus,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to create expense: ${error?.message}`);
    return data;
  }

  static async updateExpense(expenseId: string, rawInput: UpdateExpenseInput): Promise<ExpenseRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = updateExpenseSchema.parse(rawInput);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("expenses")
      .update({
        ...(input.categoryId !== undefined && { category_id: input.categoryId }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.estimatedAmount !== undefined && { estimated_amount: input.estimatedAmount }),
        ...(input.actualAmount !== undefined && { actual_amount: input.actualAmount }),
        ...(input.depositPaid !== undefined && { deposit_paid: input.depositPaid }),
        ...(input.dueDate !== undefined && { due_date: input.dueDate }),
        ...(input.paymentStatus !== undefined && { payment_status: input.paymentStatus as PaymentStatus }),
        ...(input.notes !== undefined && { notes: input.notes }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId)
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to update expense: ${error?.message}`);
    return data;
  }

  static async deleteExpense(expenseId: string): Promise<boolean> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (error) throw new Error(`Failed to delete expense: ${error.message}`);
    return true;
  }

  static async updateCategory(
    categoryId: string,
    name: string,
    allocatedAmount: number
  ): Promise<BudgetCategoryRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("budget_categories")
      .update({
        name,
        allocated_amount: allocatedAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to update category: ${error?.message}`);
    return data;
  }

  static async deleteCategory(categoryId: string): Promise<boolean> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { error } = await supabase.from("budget_categories").delete().eq("id", categoryId);
    if (error) throw new Error(`Failed to delete category: ${error.message}`);
    return true;
  }

  /**
   * Generates grounded saving proposals based on actual category utilization.
   * Strictly advisory — never modifies approved expenses.
   */
  static generateSavingsProposals(
    totalBudget: number,
    categories: BudgetCategoryRow[],
    expenses: ExpenseRow[]
  ): SavingProposal[] {
    const proposals: SavingProposal[] = [];

    // Analyze high-volume categories
    for (const cat of categories) {
      const catExpenses = expenses.filter((e) => e.category_id === cat.id);
      const totalActual = catExpenses.reduce((s, e) => s + Number(e.actual_amount || 0), 0);

      const catNameLower = cat.name.toLowerCase();

      if (catNameLower.includes("floral") || catNameLower.includes("decor")) {
        const potential = Math.round(Number(cat.allocated_amount || 0) * 0.15);
        if (potential > 200) {
          proposals.push({
            id: `sav_${cat.id}`,
            category: cat.name,
            title: `Optimize ${cat.name} with Seasonal Greenery`,
            potentialSavings: potential,
            recommendation:
              "Substitute imported off-season blooms with local in-season foliage and reusable ambient candlelight.",
            tradeOffs: [
              "Fewer premium imported stem varieties",
              "Maintains elegant aesthetic while trimming floral fabrication and shipping premiums",
            ],
          });
        }
      }

      if (catNameLower.includes("catering") || catNameLower.includes("bar")) {
        const potential = Math.round(Number(cat.allocated_amount || 0) * 0.1);
        if (potential > 400) {
          proposals.push({
            id: `sav_${cat.id}`,
            category: cat.name,
            title: "Transition to Signature Cocktail & Wine Package",
            potentialSavings: potential,
            recommendation:
              "Replace full top-shelf open bar with two curated signature cocktails plus premium wine and local craft beer.",
            tradeOffs: [
              "Guests choose from signature cocktail menu rather than unlimited spirits",
              "Substantially cuts unconsumed inventory and excess licensing surcharges",
            ],
          });
        }
      }

      if (totalActual > Number(cat.allocated_amount || 0)) {
        const overage = Math.round(totalActual - Number(cat.allocated_amount || 0));
        proposals.push({
          id: `over_${cat.id}`,
          category: cat.name,
          title: `Contain Overage in ${cat.name}`,
          potentialSavings: overage,
          recommendation: `Category is currently over budget by ₹${overage.toLocaleString()}. Review discretionary add-ons or negotiate vendor scope adjustments before final sign-off.`,
          tradeOffs: [
            "Requires scope concession with vendor",
            "Prevents cascading overall budget deficit",
          ],
        });
      }
    }

    if (proposals.length === 0 && totalBudget > 5000) {
      proposals.push({
        id: "sav_general",
        category: "General Logistics",
        title: "Vendor Bundle Optimization",
        potentialSavings: Math.round(totalBudget * 0.05),
        recommendation:
          "Consolidate sound, lighting, and DJ services under a single production vendor to eliminate redundant delivery and technician fees.",
        tradeOffs: [
          "Single point of vendor coordination",
          "Limits individual specialty boutique vendors",
        ],
      });
    }

    return proposals;
  }
}
