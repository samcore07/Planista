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
}
