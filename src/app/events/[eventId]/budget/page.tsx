import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Layers,
  Receipt,
  Trash2,
  Calendar,
} from "lucide-react";
import { EventsDAL } from "@/lib/dal/events.dal";
import { BudgetDAL, ExpenseRow } from "@/lib/dal/budget.dal";
import { BudgetService } from "@/services/budget.service";
import { ExpenseModal } from "@/components/budget/expense-modal";
import { CategoryModal } from "@/components/budget/category-modal";
import { SavingsSuggestions } from "@/components/budget/savings-suggestions";
import { deleteExpenseAction, deleteCategoryAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const instant = false;

interface BudgetPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function BudgetPageContent({ params, searchParams }: BudgetPageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;

  const event = await EventsDAL.getEventById(eventId);
  if (!event) notFound();

  const [categories, expenses] = await Promise.all([
    BudgetDAL.getCategories(eventId),
    BudgetDAL.getExpenses(eventId),
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
      paymentStatus: e.payment_status as "unpaid" | "deposit_paid" | "fully_paid",
    }))
  );

  const savingsProposals = BudgetDAL.generateSavingsProposals(
    Number(event.total_budget || 0),
    categories,
    expenses
  );

  const errorMessage = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const isSaved = resolvedSearchParams.saved === "true";
  const isDeleted = resolvedSearchParams.deleted === "true";

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Live Budget Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Deterministic decimal-safe financial monitoring, category variances, and expense tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CategoryModal eventId={eventId} />
          <ExpenseModal eventId={eventId} categories={categories} />
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSaved && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Budget updates successfully recorded and recalculated.</span>
        </div>
      )}

      {isDeleted && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Line item successfully removed.</span>
        </div>
      )}

      {/* Live Financial Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Target Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              ₹{budgetMetrics.totalBudget.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ₹{budgetMetrics.costPerGuest.toFixed(2)} / guest ({event.guest_count} guests)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Committed Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              ₹{budgetMetrics.totalActual.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ₹{budgetMetrics.totalEstimated.toLocaleString("en-IN", { minimumFractionDigits: 2 })} initial estimates
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Remaining Unspent
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                budgetMetrics.isOverBudget ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              ₹{budgetMetrics.remainingUnspent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {budgetMetrics.isOverBudget
                ? `+₹${budgetMetrics.overspendAmount.toFixed(2)} forecast deficit`
                : "Safe contingency buffer"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Outstanding Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              ₹{budgetMetrics.outstandingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ₹{budgetMetrics.totalDepositsPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })} deposits paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Grounded Savings Proposals */}
      <SavingsSuggestions proposals={savingsProposals} currency={event.currency} />

      {/* Category Breakdown Table */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Category Allocations & Variance
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Planned caps versus committed actuals across production disciplines
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {categories.length} Categories
          </Badge>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No categories configured yet. Click &quot;New Category&quot; to begin structuring your allocations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-secondary/30 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Allocated Cap</th>
                    <th className="py-2.5 px-3">Committed Actual</th>
                    <th className="py-2.5 px-3">Remaining</th>
                    <th className="py-2.5 px-3">Utilization</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {budgetMetrics.categories.map((cat, i) => {
                    const deleteWithId = deleteCategoryAction.bind(null, eventId, cat.categoryId || "");
                    return (
                      <tr key={i} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-3 font-medium text-foreground">
                          {cat.categoryName}
                        </td>
                        <td className="py-3 px-3">
                          ₹{cat.allocatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 font-medium">
                          ₹{cat.actualAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td
                          className={`py-3 px-3 font-medium ${
                            cat.isOverBudget ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          ₹{cat.remainingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 w-40">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span>{cat.percentUtilized}%</span>
                              {cat.isOverBudget && (
                                <span className="text-destructive font-semibold">Over Cap</span>
                              )}
                            </div>
                            <Progress
                              value={Math.min(100, cat.percentUtilized)}
                              className={`h-1.5 ${cat.isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {cat.categoryId && (
                            <form action={deleteWithId} className="inline-block">
                              <Button
                                variant="ghost"
                                size="sm"
                                type="submit"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Expense Ledger */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Expense Ledger & Payment Milestones
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Individual vendor commitments, paid deposits, and balance due dates
            </p>
          </div>
          <ExpenseModal eventId={eventId} categories={categories} />
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-2">
              <p>No line-item expenses recorded yet.</p>
              <ExpenseModal eventId={eventId} categories={categories} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-secondary/30 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Title & Notes</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Actual Amount</th>
                    <th className="py-2.5 px-3">Deposit Paid</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Payment Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((exp: ExpenseRow) => {
                    const deleteWithId = deleteExpenseAction.bind(null, eventId, exp.id);
                    return (
                      <tr key={exp.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">{exp.title}</div>
                          {exp.notes && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-xs">
                              {exp.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {exp.category_id ? categoryMap.get(exp.category_id) || "Category" : "Uncategorized"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          ₹{Number(exp.actual_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          ₹{Number(exp.deposit_paid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {exp.due_date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(exp.due_date).toLocaleDateString(undefined, { dateStyle: "short" })}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              exp.payment_status === "fully_paid"
                                ? "success"
                                : exp.payment_status === "deposit_paid"
                                ? "warning"
                                : "outline"
                            }
                            className="text-[10px] capitalize font-medium"
                          >
                            {exp.payment_status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <ExpenseModal
                            eventId={eventId}
                            categories={categories}
                            expense={exp}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Edit
                              </Button>
                            }
                          />

                          <form action={deleteWithId} className="inline-block">
                            <Button
                              variant="ghost"
                              size="sm"
                              type="submit"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BudgetPage(props: BudgetPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-secondary rounded" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
          </div>
        </div>
      }
    >
      <BudgetPageContent {...props} />
    </Suspense>
  );
}
