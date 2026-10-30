/**
 * @fileoverview Server Actions for managing event budget categories and line-item expenses.
 * Enforces Zod validation, tenant isolation, and triggers real-time ledger orchestration.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BudgetDAL, createCategorySchema, createExpenseSchema, updateExpenseSchema } from "@/lib/dal/budget.dal";
import { EventOrchestratorService } from "@/services/orchestrator.service";
import {
  getFormString,
  getOptionalFormString,
  getFormNumber,
  getOptionalFormNumber,
} from "@/lib/form-utils";

function parsePaymentStatus(val: string | null): "unpaid" | "deposit_paid" | "fully_paid" {
  if (val === "deposit_paid" || val === "fully_paid") return val;
  return "unpaid";
}

/**
 * Server action to create a new budget department category.
 *
 * @param eventId - UUID of the target event.
 * @param formData - Form data containing name and allocatedAmount.
 */
export async function createCategoryAction(eventId: string, formData: FormData): Promise<void> {
  const name = getFormString(formData, "name");
  const allocatedAmount = getFormNumber(formData, "allocatedAmount", 0);

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
  const categoryIdRaw = getOptionalFormString(formData, "categoryId");
  const categoryId = categoryIdRaw && categoryIdRaw !== "uncategorized" ? categoryIdRaw : null;
  const title = getFormString(formData, "title");
  const estimatedAmount = getFormNumber(formData, "estimatedAmount", 0);
  const actualAmount = getFormNumber(formData, "actualAmount", 0);
  const depositPaid = getFormNumber(formData, "depositPaid", 0);
  const dueDate = getOptionalFormString(formData, "dueDate");
  const paymentStatus = parsePaymentStatus(getOptionalFormString(formData, "paymentStatus"));
  const notes = getOptionalFormString(formData, "notes");

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
  const categoryIdRaw = getOptionalFormString(formData, "categoryId");
  const categoryId = categoryIdRaw && categoryIdRaw !== "uncategorized" ? categoryIdRaw : null;
  const title = getOptionalFormString(formData, "title") ?? undefined;
  const estimatedAmount = getOptionalFormNumber(formData, "estimatedAmount");
  const actualAmount = getOptionalFormNumber(formData, "actualAmount");
  const depositPaid = getOptionalFormNumber(formData, "depositPaid");
  const dueDate = getOptionalFormString(formData, "dueDate");
  const rawPaymentStatus = getOptionalFormString(formData, "paymentStatus");
  const paymentStatus = rawPaymentStatus ? parsePaymentStatus(rawPaymentStatus) : undefined;
  const notes = getOptionalFormString(formData, "notes");

  const parsed = updateExpenseSchema.safeParse({
    categoryId,
    title,
    estimatedAmount: estimatedAmount !== null ? estimatedAmount : undefined,
    actualAmount: actualAmount !== null ? actualAmount : undefined,
    depositPaid: depositPaid !== null ? depositPaid : undefined,
    dueDate: dueDate ? new Date(dueDate).toISOString().split("T")[0] : null,
    paymentStatus,
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
