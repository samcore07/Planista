/**
 * @fileoverview Server Actions for managing event budget categories and line-item expenses.
 * Enforces Zod validation, tenant isolation, and triggers real-time ledger orchestration.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BudgetDAL, createCategorySchema, createExpenseSchema, updateExpenseSchema } from "@/lib/dal/budget.dal";
import { EventOrchestratorService } from "@/services/orchestrator.service";

/**
 * Server action to create a new budget department category.
 *
 * @param eventId - UUID of the target event.
 * @param formData - Form data containing name and allocatedAmount.
 */
export async function createCategoryAction(eventId: string, formData: FormData): Promise<void> {
  const name = formData.get("name") as string;
  const allocatedAmount = Number(formData.get("allocatedAmount") || 0);

  const parsed = createCategorySchema.safeParse({
    eventId,
    name,
    allocatedAmount,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid category input";
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    await BudgetDAL.createCategory(parsed.data);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create category";
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/budget`);
  redirect(`/events/${eventId}/budget?saved=true`);
}

export async function createExpenseAction(eventId: string, formData: FormData): Promise<void> {
  const categoryIdRaw = formData.get("categoryId") as string;
  const categoryId = categoryIdRaw && categoryIdRaw !== "uncategorized" ? categoryIdRaw : null;
  const title = formData.get("title") as string;
  const estimatedAmount = Number(formData.get("estimatedAmount") || 0);
  const actualAmount = Number(formData.get("actualAmount") || 0);
  const depositPaid = Number(formData.get("depositPaid") || 0);
  const dueDate = (formData.get("dueDate") as string) || null;
  const paymentStatus = (formData.get("paymentStatus") as "unpaid" | "deposit_paid" | "fully_paid") || "unpaid";
  const notes = (formData.get("notes") as string) || null;

  const parsed = createExpenseSchema.safeParse({
    eventId,
    categoryId,
    title,
    estimatedAmount,
    actualAmount,
    depositPaid,
    dueDate: dueDate ? new Date(dueDate).toISOString().split("T")[0] : null,
    paymentStatus,
    notes,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid expense input";
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    await BudgetDAL.createExpense(parsed.data);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create expense";
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/budget`);
  redirect(`/events/${eventId}/budget?saved=true`);
}

export async function updateExpenseAction(
  eventId: string,
  expenseId: string,
  formData: FormData
): Promise<void> {
  const categoryIdRaw = formData.get("categoryId") as string;
  const categoryId = categoryIdRaw && categoryIdRaw !== "uncategorized" ? categoryIdRaw : null;
  const title = formData.get("title") as string;
  const estimatedAmountRaw = formData.get("estimatedAmount");
  const actualAmountRaw = formData.get("actualAmount");
  const depositPaidRaw = formData.get("depositPaid");
  const dueDate = (formData.get("dueDate") as string) || null;
  const paymentStatus = formData.get("paymentStatus") as "unpaid" | "deposit_paid" | "fully_paid" | null;
  const notes = (formData.get("notes") as string) || null;

  const parsed = updateExpenseSchema.safeParse({
    categoryId,
    title,
    estimatedAmount: estimatedAmountRaw !== null ? Number(estimatedAmountRaw) : undefined,
    actualAmount: actualAmountRaw !== null ? Number(actualAmountRaw) : undefined,
    depositPaid: depositPaidRaw !== null ? Number(depositPaidRaw) : undefined,
    dueDate: dueDate ? new Date(dueDate).toISOString().split("T")[0] : null,
    paymentStatus: paymentStatus || undefined,
    notes,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid expense updates";
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    await BudgetDAL.updateExpense(expenseId, parsed.data);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update expense";
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/budget`);
  redirect(`/events/${eventId}/budget?saved=true`);
}

export async function deleteExpenseAction(eventId: string, expenseId: string): Promise<void> {
  try {
    await BudgetDAL.deleteExpense(expenseId);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete expense";
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/budget`);
  redirect(`/events/${eventId}/budget?deleted=true`);
}

export async function deleteCategoryAction(eventId: string, categoryId: string): Promise<void> {
  try {
    await BudgetDAL.deleteCategory(categoryId);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete category";
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/budget`);
  redirect(`/events/${eventId}/budget?deleted=true`);
}
