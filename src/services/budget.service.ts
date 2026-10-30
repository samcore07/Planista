export interface BudgetCategoryItem {
  id: string;
  eventId: string;
  name: string;
  allocatedAmount: number;
}

export interface ExpenseItem {
  id: string;
  eventId: string;
  categoryId: string | null;
  title: string;
  estimatedAmount: number;
  actualAmount: number;
  depositPaid: number;
  dueDate: string | null;
  paymentStatus: "unpaid" | "deposit_paid" | "fully_paid";
}

export interface CategorySummary {
  categoryId: string | null;
  categoryName: string;
  allocatedAmount: number;
  estimatedAmount: number;
  actualAmount: number;
  depositsPaid?: number;
  outstandingBalance?: number;
  varianceAmount: number; // actual - allocated
  remainingAmount: number; // allocated - actual
  percentUtilized: number;
  isOverBudget: boolean;
}

export interface BudgetCalculationResult {
  totalBudget: number;
  totalAllocated: number;
  totalEstimated: number;
  totalActual: number;
  totalDepositsPaid: number;
  outstandingBalance: number;
  remainingUnallocated: number;
  remainingUnspent: number;
  costPerGuest: number;
  categories: CategorySummary[];
  isOverBudget: boolean;
  overspendAmount: number;
}

/**
 * Safe currency arithmetic rounding to 2 decimal places.
 * Rejects non-finite numbers (NaN, Infinity) returning 0 to prevent downstream math contamination.
 */
export function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Deterministic live budget calculation service.
 * Never relies on an LLM for financial math.
 */
export class BudgetService {
  /**
   * Calculates comprehensive event budget metrics
   */
  static calculate(
    totalBudget: number,
    guestCount: number,
    categories: BudgetCategoryItem[],
    expenses: ExpenseItem[]
  ): BudgetCalculationResult {
    const safeTotalBudget = Number.isFinite(totalBudget) ? Math.max(0, roundCurrency(totalBudget)) : 0;
    const safeGuestCount = Number.isFinite(guestCount) ? Math.max(0, Math.floor(guestCount)) : 0;

    let totalAllocated = 0;
    let totalEstimated = 0;
    let totalActual = 0;
    let totalDepositsPaid = 0;

    // Group expenses by category
    const expenseMap = new Map<string, { estimated: number; actual: number; depositsPaid: number }>();

    for (const exp of expenses) {
      const est = Math.max(0, roundCurrency(exp.estimatedAmount));
      const act = Math.max(0, roundCurrency(exp.actualAmount));
      // Reconcile deposit paid: if paymentStatus is fully_paid, full amount is paid at once
      const isFullyPaid = exp.paymentStatus === "fully_paid";
      const dep = isFullyPaid ? act : Math.min(act, Math.max(0, roundCurrency(exp.depositPaid)));

      totalEstimated = roundCurrency(totalEstimated + est);
      totalActual = roundCurrency(totalActual + act);
      totalDepositsPaid = roundCurrency(totalDepositsPaid + dep);

      const catId = exp.categoryId || "uncategorized";
      const existing = expenseMap.get(catId) || { estimated: 0, actual: 0, depositsPaid: 0 };
      expenseMap.set(catId, {
        estimated: roundCurrency(existing.estimated + est),
        actual: roundCurrency(existing.actual + act),
        depositsPaid: roundCurrency(existing.depositsPaid + dep),
      });
    }

    // Build category summaries
    const categorySummaries: CategorySummary[] = [];

    for (const cat of categories) {
      const allocated = Math.max(0, roundCurrency(cat.allocatedAmount));
      totalAllocated = roundCurrency(totalAllocated + allocated);

      const catExpenses = expenseMap.get(cat.id) || { estimated: 0, actual: 0, depositsPaid: 0 };
      const variance = roundCurrency(catExpenses.actual - allocated);
      const remaining = roundCurrency(allocated - catExpenses.actual);
      const percent = allocated > 0 ? roundCurrency((catExpenses.actual / allocated) * 100) : 0;
      const catOutstanding = roundCurrency(Math.max(0, catExpenses.actual - catExpenses.depositsPaid));

      categorySummaries.push({
        categoryId: cat.id,
        categoryName: cat.name,
        allocatedAmount: allocated,
        estimatedAmount: catExpenses.estimated,
        actualAmount: catExpenses.actual,
        depositsPaid: catExpenses.depositsPaid,
        outstandingBalance: catOutstanding,
        varianceAmount: variance,
        remainingAmount: remaining,
        percentUtilized: percent,
        isOverBudget: catExpenses.actual > allocated,
      });

      expenseMap.delete(cat.id);
    }

    // Handle any uncategorized expenses
    for (const [catId, uncatExp] of expenseMap.entries()) {
      if (uncatExp.actual > 0 || uncatExp.estimated > 0) {
        const uncatOutstanding = roundCurrency(Math.max(0, uncatExp.actual - uncatExp.depositsPaid));
        categorySummaries.push({
          categoryId: catId === "uncategorized" ? null : catId,
          categoryName: "Uncategorized",
          allocatedAmount: 0,
          estimatedAmount: uncatExp.estimated,
          actualAmount: uncatExp.actual,
          depositsPaid: uncatExp.depositsPaid,
          outstandingBalance: uncatOutstanding,
          varianceAmount: uncatExp.actual,
          remainingAmount: -uncatExp.actual,
          percentUtilized: 100,
          isOverBudget: uncatExp.actual > 0,
        });
      }
    }

    const remainingUnallocated = roundCurrency(safeTotalBudget - totalAllocated);
    const remainingUnspent = roundCurrency(safeTotalBudget - totalActual);
    const outstandingBalance = roundCurrency(Math.max(0, totalActual - totalDepositsPaid));
    const isOverBudget = totalActual > safeTotalBudget;
    const overspendAmount = isOverBudget ? roundCurrency(totalActual - safeTotalBudget) : 0;

    const costPerGuest =
      safeGuestCount > 0 ? roundCurrency(safeTotalBudget / safeGuestCount) : 0;

    return {
      totalBudget: safeTotalBudget,
      totalAllocated,
      totalEstimated,
      totalActual,
      totalDepositsPaid,
      outstandingBalance,
      remainingUnallocated,
      remainingUnspent,
      costPerGuest,
      categories: categorySummaries,
      isOverBudget,
      overspendAmount,
    };
  }

  /**
   * Recalculates cost per guest when guest count updates
   */
  static calculateCostPerGuest(totalBudget: number, guestCount: number): number {
    if (!Number.isFinite(totalBudget) || !Number.isFinite(guestCount) || guestCount <= 0) return 0;
    return roundCurrency(totalBudget / guestCount);
  }
}
