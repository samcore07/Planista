/**
 * @fileoverview Printable HTML Document Builder for Event Data Packs.
 * Compiles real-time event metadata, budgets, timeline tasks, vendor directories,
 * and risk audits into a print-optimized document with embedded CSS stylesheets.
 */

import { EventExportBundle } from "@/services/export.service";
import { roundCurrency, calculateExpenseBalance } from "@/services/budget.service";

/**
 * Escapes HTML entities to prevent XSS injection in generated document output.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "critical":
      return "badge-critical";
    case "high":
      return "badge-high";
    case "medium":
      return "badge-medium";
    default:
      return "badge-low";
  }
}

function getSeverityBadgeClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "badge-critical";
    case "high":
      return "badge-high";
    case "medium":
      return "badge-medium";
    default:
      return "badge-low";
  }
}

export class ExportHtmlBuilder {
  /**
   * Generates a comprehensive, print-friendly HTML document with full print stylesheet.
   * Users can print directly to PDF or paper using standard browser print capabilities.
   *
   * @param bundle - Complete snapshot of the event and child entities.
   * @returns Complete self-contained HTML document string.
   */
  static buildPrintableHtml(bundle: EventExportBundle): string {
    const { event, categories, expenses, tasks, risks, vendors, generatedAt } = bundle;

    const totalAllocated = roundCurrency(categories.reduce((sum, c) => sum + Number(c.allocated_amount || 0), 0));
    const totalActual = roundCurrency(expenses.reduce((sum, e) => sum + Number(e.actual_amount || 0), 0));
    const remainingBudget = roundCurrency(Number(event.total_budget || 0) - totalActual);
    const costPerGuest = event.guest_count > 0 ? (totalActual / event.guest_count).toFixed(2) : "0.00";

    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const taskProgressPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(event.title)} — Event Pack</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      line-height: 1.5;
      padding: 0;
      margin: 0;
    }
    .header {
      border-bottom: 2px solid #111827;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title {
      font-size: 2rem;
      font-weight: 800;
      margin: 0;
      color: #111827;
    }
    .meta {
      font-size: 0.875rem;
      color: #4b5563;
      margin-top: 0.25rem;
    }
    .timestamp {
      font-size: 0.75rem;
      color: #6b7280;
      text-align: right;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.5rem;
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: #1f2937;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      background: #f9fafb;
    }
    .stat-label {
      font-size: 0.75rem;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      margin-top: 0.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
      margin-bottom: 1.5rem;
    }
    th {
      background: #f3f4f6;
      text-align: left;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e5e7eb;
      font-weight: 600;
      color: #374151;
    }
    td {
      padding: 0.5rem 0.75rem;
      border: 1px solid #e5e7eb;
      color: #374151;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.4rem;
      font-size: 0.7rem;
      font-weight: 600;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #fef3c7; color: #92400e; }
    .badge-medium { background: #e0f2fe; color: #075985; }
    .badge-low { background: #f3f4f6; color: #374151; }
    .print-bar {
      background: #1e293b;
      color: #fff;
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .print-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
    }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span>Planista Official Event Pack — Ready to Print / Save as PDF</span>
    <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">${escapeHtml(event.title)}</h1>
      <div class="meta">
        Type: <strong>${escapeHtml(event.event_type)}</strong> &bull;
        Date: <strong>${event.event_date || "TBD"}</strong> &bull;
        Location: <strong>${escapeHtml(event.location || "TBD")}</strong> &bull;
        Guests: <strong>${event.guest_count}</strong> &bull;
        Status: <strong>${escapeHtml(event.status)}</strong>
      </div>
    </div>
    <div class="timestamp">
      Generated: ${new Date(generatedAt).toLocaleString()}<br>
      Planista Event Management
    </div>
  </div>

  <!-- Key Metrics -->
  <div class="grid">
    <div class="stat-card">
      <div class="stat-label">Total Budget</div>
      <div class="stat-value">${event.currency} ${Number(event.total_budget).toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Actual Spent</div>
      <div class="stat-value">${event.currency} ${totalActual.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Remaining</div>
      <div class="stat-value" style="color: ${remainingBudget < 0 ? '#dc2626' : '#16a34a'}">
        ${event.currency} ${remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Task Progress</div>
      <div class="stat-value">${taskProgressPct}% (${completedTasks}/${tasks.length})</div>
    </div>
  </div>

  <!-- Budget Breakdown -->
  <h2>1. Budget Overview & Expenses (Allocated: ${event.currency} ${totalAllocated.toLocaleString()} &bull; Cost/Guest: ${event.currency} ${costPerGuest})</h2>
  <table>
    <thead>
      <tr>
        <th>Category / Expense Item</th>
        <th>Payment Status</th>
        <th>Due Date</th>
        <th style="text-align: right">Estimated</th>
        <th style="text-align: right">Actual</th>
        <th style="text-align: right">Deposit Paid</th>
        <th style="text-align: right">Amount Left</th>
      </tr>
    </thead>
    <tbody>
      ${
        expenses.length === 0
          ? `<tr><td colspan="7" style="text-align: center; color: #6b7280;">No expenses recorded yet.</td></tr>`
          : expenses
              .map(
                (e) => {
                  const actual = Number(e.actual_amount);
                  const balance = calculateExpenseBalance(actual, Number(e.deposit_paid || 0), e.payment_status);
                  return `
        <tr>
          <td><strong>${escapeHtml(e.title)}</strong></td>
          <td><span class="badge ${balance.isFullyPaid ? 'badge-medium' : 'badge-low'}">${escapeHtml(e.payment_status)}</span></td>
          <td>${e.due_date ? e.due_date.split("T")[0] : "—"}</td>
          <td style="text-align: right">${event.currency} ${Number(e.estimated_amount).toFixed(2)}</td>
          <td style="text-align: right"><strong>${event.currency} ${actual.toFixed(2)}</strong></td>
          <td style="text-align: right">${event.currency} ${balance.depositPaid.toFixed(2)}</td>
          <td style="text-align: right; color: ${balance.outstandingBalance > 0 ? '#b45309' : '#15803d'}">
            <strong>${event.currency} ${balance.outstandingBalance.toFixed(2)}</strong>
          </td>
        </tr>`;
                }
              )
              .join("")
      }
    </tbody>
  </table>

  <!-- Timeline & Checklist -->
  <div class="page-break"></div>
  <h2>2. Timeline & Run Sheet</h2>
  <table>
    <thead>
      <tr>
        <th>Task Title</th>
        <th>Priority</th>
        <th>Status</th>
        <th>Due Date</th>
        <th>Est. Hours</th>
      </tr>
    </thead>
    <tbody>
      ${
        tasks.length === 0
          ? `<tr><td colspan="5" style="text-align: center; color: #6b7280;">No tasks scheduled yet.</td></tr>`
          : tasks
              .map(
                (t) => `
        <tr>
          <td><strong>${escapeHtml(t.title)}</strong></td>
          <td><span class="badge ${getPriorityBadgeClass(t.priority)}">${escapeHtml(t.priority)}</span></td>
          <td>${escapeHtml(t.status)}</td>
          <td>${t.due_date ? t.due_date.split("T")[0] : "Unscheduled"}</td>
          <td>${t.estimated_duration_hours ? `${t.estimated_duration_hours}h` : "—"}</td>
        </tr>`
              )
              .join("")
      }
    </tbody>
  </table>

  <!-- Vendors Directory -->
  <h2>3. Vendor Directory & Quoted Services</h2>
  <table>
    <thead>
      <tr>
        <th>Vendor Name</th>
        <th>Category</th>
        <th>Status</th>
        <th>Quoted Amount</th>
        <th>Contact Email / Phone</th>
      </tr>
    </thead>
    <tbody>
      ${
        vendors.length === 0
          ? `<tr><td colspan="5" style="text-align: center; color: #6b7280;">No vendors assigned yet.</td></tr>`
          : vendors
              .map(
                (v) => `
        <tr>
          <td><strong>${escapeHtml(v.name)}</strong></td>
          <td>${escapeHtml(v.category)}</td>
          <td><span class="badge badge-low">${escapeHtml(v.status)}</span></td>
          <td>${v.quoted_amount ? `${event.currency} ${Number(v.quoted_amount).toFixed(2)}` : "—"}</td>
          <td>${escapeHtml(v.contact_email || "")} ${v.contact_phone ? `(${escapeHtml(v.contact_phone)})` : ""}</td>
        </tr>`
              )
              .join("")
      }
    </tbody>
  </table>

  <!-- Risk Radar & Contingencies -->
  <h2>4. Risk Radar & Contingency Action Plans</h2>
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Category</th>
        <th>Identified Risk & Supporting Facts</th>
        <th>Mitigation Protocol</th>
      </tr>
    </thead>
    <tbody>
      ${
        risks.length === 0
          ? `<tr><td colspan="4" style="text-align: center; color: #6b7280;">No active risks detected. Operations on schedule.</td></tr>`
          : risks
              .map(
                (r) => `
        <tr>
          <td><span class="badge ${getSeverityBadgeClass(r.severity)}">${escapeHtml(r.severity)}</span></td>
          <td>${escapeHtml(r.category)}</td>
          <td>
            <strong>${escapeHtml(r.title)}</strong><br>
            <span style="font-size: 0.75rem; color: #4b5563;">${escapeHtml(r.explanation || "")}</span>
          </td>
          <td style="font-size: 0.75rem; color: #1f2937;">${escapeHtml(r.mitigation_action || "No mitigation defined")}</td>
        </tr>`
              )
              .join("")
      }
    </tbody>
  </table>

  <!-- Emergency Contacts -->
  <h2>5. Emergency Contacts & Coordinator Sign-off</h2>
  <table>
    <thead>
      <tr>
        <th>Role</th>
        <th>Name</th>
        <th>Contact Number</th>
        <th>Notes / Responsibility</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Lead Event Coordinator</strong></td>
        <td>Event Planner</td>
        <td>Primary Emergency Line</td>
        <td>Operational authority on event day</td>
      </tr>
      <tr>
        <td><strong>Venue Operations Lead</strong></td>
        <td>Venue Manager</td>
        <td>Front Desk & Security</td>
        <td>Access, power, facilities</td>
      </tr>
      <tr>
        <td><strong>Emergency Medical & Security</strong></td>
        <td>Local Services</td>
        <td>911 / Local Emergency</td>
        <td>Emergency response protocol</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
  }
}
