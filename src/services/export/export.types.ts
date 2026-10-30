/**
 * @fileoverview Domain data contracts and bundle types for Event Pack exports.
 * Isolated from builder and orchestrator implementations to avoid circular dependencies.
 */

import { EventRow } from "@/lib/dal/events.dal";
import { BudgetCategoryRow, ExpenseRow } from "@/lib/dal/budget.dal";
import { TaskRow } from "@/lib/dal/tasks.dal";
import { RiskRow } from "@/lib/dal/risk.dal";
import { Database } from "@/types/database.types";

export type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];

export interface EventExportBundle {
  event: EventRow;
  categories: BudgetCategoryRow[];
  expenses: ExpenseRow[];
  tasks: TaskRow[];
  risks: RiskRow[];
  vendors: VendorRow[];
  generatedAt: string;
}
