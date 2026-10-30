/**
 * @fileoverview CSV Document Builder for Event Data Exports.
 * Serializes budget expenses, task timelines, and vendor directories into RFC 4180-compliant CSV files.
 */

import { EventExportBundle } from "@/services/export.service";
import { calculateExpenseBalance } from "@/services/budget.service";

/**
 * Escapes CSV special characters and quotes fields in compliance with RFC 4180.
 */
function serializeCsvRow(row: (string | number | null | undefined)[]): string {
  return row
    .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
    .join(",");
}

export class ExportCsvBuilder {
  /**
   * Generates a sanitized CSV spreadsheet for event budget categories and line-item expenses.
   *
   * @param bundle - Complete snapshot of the event and financial entities.
   * @returns Formatted CSV document string.
   */
  static buildBudgetCsv(bundle: EventExportBundle): string {
    const rows: (string | number)[][] = [
      [
        "Category",
        "Expense Title",
        "Estimated Amount",
        "Actual Amount",
        "Deposit Paid",
        "Amount Left",
        "Due Date",
        "Payment Status",
        "Notes",
      ],
    ];

    const categoryMap = new Map<string, string>();
    bundle.categories.forEach((c) => categoryMap.set(c.id, c.name));

    for (const exp of bundle.expenses) {
      const categoryName = exp.category_id ? categoryMap.get(exp.category_id) || "Uncategorized" : "Uncategorized";
      const actual = Number(exp.actual_amount);
      const balance = calculateExpenseBalance(actual, Number(exp.deposit_paid || 0), exp.payment_status);

      rows.push([
        categoryName,
        exp.title,
        Number(exp.estimated_amount).toFixed(2),
        actual.toFixed(2),
        balance.depositPaid.toFixed(2),
        balance.outstandingBalance.toFixed(2),
        exp.due_date || "N/A",
        exp.payment_status,
        exp.notes || "",
      ]);
    }

    return rows.map(serializeCsvRow).join("\n");
  }

  /**
   * Generates a sanitized CSV spreadsheet for event timeline tasks and run sheets.
   *
   * @param bundle - Complete snapshot of the event and task entities.
   * @returns Formatted CSV document string.
   */
  static buildTasksCsv(bundle: EventExportBundle): string {
    const rows: (string | number)[][] = [
      ["Task Title", "Priority", "Status", "Due Date", "Est Duration (Hours)", "Assignee"],
    ];

    for (const task of bundle.tasks) {
      rows.push([
        task.title,
        task.priority,
        task.status,
        task.due_date ? task.due_date.split("T")[0] : "Not Scheduled",
        String(task.estimated_duration_hours || 0),
        task.assignee || "Unassigned",
      ]);
    }

    return rows.map(serializeCsvRow).join("\n");
  }

  /**
   * Generates a sanitized CSV spreadsheet for event vendors and contractor directories.
   *
   * @param bundle - Complete snapshot of the event and vendor entities.
   * @returns Formatted CSV document string.
   */
  static buildVendorsCsv(bundle: EventExportBundle): string {
    const rows: (string | number)[][] = [
      ["Vendor Name", "Category", "Status", "Quoted Amount", "Email", "Phone", "Notes"],
    ];

    for (const v of bundle.vendors) {
      rows.push([
        v.name,
        v.category,
        v.status,
        v.quoted_amount ? Number(v.quoted_amount).toFixed(2) : "0.00",
        v.contact_email || "N/A",
        v.contact_phone || "N/A",
        v.notes || "",
      ]);
    }

    return rows.map(serializeCsvRow).join("\n");
  }
}
