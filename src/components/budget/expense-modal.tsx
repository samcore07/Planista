"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { BudgetCategoryRow, ExpenseRow } from "@/lib/dal/budget.dal";
import { createExpenseAction, updateExpenseAction } from "@/app/events/[eventId]/budget/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ExpenseModalProps {
  eventId: string;
  categories: BudgetCategoryRow[];
  expense?: ExpenseRow;
  trigger?: React.ReactNode;
}

export function ExpenseModal({ eventId, categories, expense, trigger }: ExpenseModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const isEditing = !!expense;

  const handleSubmit = (formData: FormData) => {
    setIsOpen(false);
    if (isEditing && expense) {
      updateExpenseAction(eventId, expense.id, formData);
    } else {
      createExpenseAction(eventId, formData);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)}>{trigger}</span>
      ) : (
        <Button size="sm" onClick={() => setIsOpen(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Expense
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {isEditing ? "Edit Expense Line Item" : "Record New Expense"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Expense Title *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Venue Rental Deposit, DJ Retainer, Table Linens"
                  defaultValue={expense?.title || ""}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Budget Category</Label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    defaultValue={expense?.category_id || "uncategorized"}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="uncategorized">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <select
                    id="paymentStatus"
                    name="paymentStatus"
                    defaultValue={expense?.payment_status || "unpaid"}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="deposit_paid">Deposit Paid</option>
                    <option value="fully_paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="estimatedAmount">Estimated Amount</Label>
                  <Input
                    id="estimatedAmount"
                    name="estimatedAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={expense?.estimated_amount ? Number(expense.estimated_amount) : 0}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="actualAmount">Actual Committed</Label>
                  <Input
                    id="actualAmount"
                    name="actualAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={expense?.actual_amount ? Number(expense.actual_amount) : 0}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="depositPaid">Deposit Paid</Label>
                  <Input
                    id="depositPaid"
                    name="depositPaid"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={expense?.deposit_paid ? Number(expense.deposit_paid) : 0}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Payment Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={expense?.due_date || ""}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes & Verification Terms</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Payment milestones, cancellation clauses, or vendor contract details..."
                  defaultValue={expense?.notes || ""}
                  rows={2}
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  {isEditing ? "Save Changes" : "Record Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
