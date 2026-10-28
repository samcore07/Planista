import { describe, it, expect } from "vitest";
import { ExportService, EventExportBundle } from "../export.service";

describe("ExportService Unit Tests", () => {
  const mockBundle: EventExportBundle = {
    event: {
      id: "evt_100",
      user_id: "usr_100",
      title: "Gala Dinner 2026",
      event_type: "Corporate Gala",
      description: null,
      event_date: "2026-12-15",
      location: "Metropolitan Grand Ballroom",
      guest_count: 150,
      total_budget: 25000,
      currency: "USD",
      status: "planning",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    categories: [
      {
        id: "cat_1",
        event_id: "evt_100",
        name: "Catering",
        allocated_amount: 12000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    expenses: [
      {
        id: "exp_1",
        event_id: "evt_100",
        category_id: "cat_1",
        title: "Three-Course Dinner Deposit",
        estimated_amount: 10000,
        actual_amount: 9500,
        deposit_paid: 3000,
        due_date: "2026-11-01",
        payment_status: "deposit_paid",
        notes: "Includes vegetarian options",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    tasks: [
      {
        id: "task_1",
        event_id: "evt_100",
        title: "Confirm menu selections",
        description: null,
        priority: "high",
        status: "in_progress",
        due_date: "2026-10-30",
        estimated_duration_hours: 1,
        assignee: null,
        category: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    risks: [
      {
        id: "risk_1",
        event_id: "evt_100",
        title: "Catering final headcount cutoff",
        severity: "medium",
        category: "budget",
        explanation: "Late RSVP additions may incur surcharge",
        supporting_facts: ["Headcount deadline is 2 weeks prior"],
        mitigation_action: "Send reminder 2 weeks prior",
        is_resolved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    vendors: [
      {
        id: "v_1",
        event_id: "evt_100",
        name: "Culinary Masters Co.",
        category: "Catering",
        contact_email: "chef@culinarymasters.com",
        contact_phone: "+1-555-0199",
        quoted_amount: 9500,
        status: "contracted",
        contract_url: null,
        notes: "Tasting approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  describe("Duplicate Export Locking", () => {
    it("locks and prevents concurrent duplicate exports for the same event and format", () => {
      const acquiredFirst = ExportService.acquireLock("evt_lock_test", "html");
      expect(acquiredFirst).toBe(true);

      const acquiredSecond = ExportService.acquireLock("evt_lock_test", "html");
      expect(acquiredSecond).toBe(false);

      ExportService.releaseLock("evt_lock_test", "html");

      const acquiredThird = ExportService.acquireLock("evt_lock_test", "html");
      expect(acquiredThird).toBe(true);
      ExportService.releaseLock("evt_lock_test", "html");
    });
  });

  describe("CSV Generation", () => {
    it("generates well-formatted Budget CSV with headers and sanitized values", () => {
      const csv = ExportService.generateBudgetCsv(mockBundle);
      expect(csv).toContain('"Category","Expense Title","Estimated Amount","Actual Amount","Deposit Paid","Amount Left"');
      expect(csv).toContain('"Catering","Three-Course Dinner Deposit","10000.00","9500.00","3000.00","6500.00"');
      expect(csv).toContain('"Includes vegetarian options"');
    });

    it("ensures fully_paid expenses in CSV output full deposit and zero amount left", () => {
      const fullyPaidBundle: EventExportBundle = {
        ...mockBundle,
        expenses: [
          {
            ...mockBundle.expenses[0],
            payment_status: "fully_paid",
            deposit_paid: 0, // initially zero, should reconcile to full actual amount
          },
        ],
      };
      const csv = ExportService.generateBudgetCsv(fullyPaidBundle);
      expect(csv).toContain('"Catering","Three-Course Dinner Deposit","10000.00","9500.00","9500.00","0.00"');
    });

    it("generates well-formatted Tasks CSV with run sheet timeline details", () => {
      const csv = ExportService.generateTasksCsv(mockBundle);
      expect(csv).toContain('"Task Title","Priority","Status","Due Date"');
      expect(csv).toContain('"Confirm menu selections","high","in_progress","2026-10-30"');
    });

    it("generates well-formatted Vendors CSV", () => {
      const csv = ExportService.generateVendorsCsv(mockBundle);
      expect(csv).toContain('"Vendor Name","Category","Status","Quoted Amount"');
      expect(csv).toContain('"Culinary Masters Co.","Catering","contracted","9500.00"');
      expect(csv).toContain('"chef@culinarymasters.com"');
      expect(csv).toContain('"+1-555-0199"');
    });
  });

  describe("Printable Event Pack HTML", () => {
    it("generates comprehensive printable HTML document bundle", () => {
      const html = ExportService.generatePrintableHtml(mockBundle);
      expect(html).toContain("Gala Dinner 2026");
      expect(html).toContain("Metropolitan Grand Ballroom");
      expect(html).toContain("USD 25,000");
      expect(html).toContain("USD 9,500.00");
      expect(html).toContain("Three-Course Dinner Deposit");
      expect(html).toContain("Confirm menu selections");
      expect(html).toContain("Culinary Masters Co.");
      expect(html).toContain("Catering final headcount cutoff");
      expect(html).toContain("Emergency Contacts & Coordinator Sign-off");
      expect(html).toContain("@media print");
      expect(html).toContain("window.print()");
    });
  });
});
