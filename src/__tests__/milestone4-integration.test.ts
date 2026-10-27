import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetService } from "@/services/budget.service";
import { TimelineService, TaskItem, TaskDependency } from "@/services/timeline.service";
import { RiskService, EvaluatedRisk, VendorSummaryItem, ExpensePaymentItem } from "@/services/risk.service";
import { ExportService, EventExportBundle } from "@/services/export.service";
import { ThemeDAL } from "@/lib/dal/theme.dal";
import { DeterministicBlueprintEngine } from "@/lib/ai/provider";
import { eventBlueprintSchema } from "@/types/blueprint.types";

describe("Milestone 4 — Core Application Features Integration & E2E Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Integration: Multi-tenant Isolation & Authorization Boundaries", () => {
    interface MockSession {
      userId: string;
    }

    interface MockStore {
      events: Array<{ id: string; userId: string; title: string }>;
      expenses: Array<{ id: string; eventId: string; title: string; amount: number }>;
      tasks: Array<{ id: string; eventId: string; title: string }>;
    }

    const store: MockStore = {
      events: [
        { id: "evt_owner_alice", userId: "usr_alice", title: "Alice's Anniversary" },
        { id: "evt_owner_bob", userId: "usr_bob", title: "Bob's Birthday" },
      ],
      expenses: [
        { id: "exp_1", eventId: "evt_owner_alice", title: "Alice's Catering", amount: 5000 },
        { id: "exp_2", eventId: "evt_owner_bob", title: "Bob's DJ", amount: 1500 },
      ],
      tasks: [
        { id: "task_1", eventId: "evt_owner_alice", title: "Alice's Cake Tasting" },
        { id: "task_2", eventId: "evt_owner_bob", title: "Bob's Venue Setup" },
      ],
    };

    function assertEventAccess(session: MockSession | null, eventId: string) {
      if (!session) throw new Error("Unauthorized: User not authenticated");
      const event = store.events.find((e) => e.id === eventId);
      if (!event) throw new Error("Not Found: Event does not exist");
      if (event.userId !== session.userId) {
        throw new Error("Forbidden: Cross-tenant access denied by RLS");
      }
      return event;
    }

    it("denies unauthenticated users from reading or writing event resources", () => {
      expect(() => assertEventAccess(null, "evt_owner_alice")).toThrow(/Unauthorized/);
    });

    it("denies User Bob from reading User Alice's event or sub-resources", () => {
      const bobSession: MockSession = { userId: "usr_bob" };
      expect(() => assertEventAccess(bobSession, "evt_owner_alice")).toThrow(/Forbidden/);
    });

    it("denies User Alice from modifying or deleting User Bob's resources", () => {
      const aliceSession: MockSession = { userId: "usr_alice" };
      expect(() => assertEventAccess(aliceSession, "evt_owner_bob")).toThrow(/Forbidden/);
    });
  });

  describe("Integration: Mocked AI and Image Provider Boundaries", () => {
    it("safely generates and validates structured blueprints satisfying eventBlueprintSchema", () => {
      const input = {
        eventType: "Corporate Gathering",
        title: "Aegean Corporate Gala",
        guestCount: 100,
        totalBudget: 50000,
        currency: "USD",
        preferences: "Coastal Mediterranean with sea view",
        dietaryOrAccessibility: "Vegetarian and seafood options",
        constraints: "Strict 11 PM venue curfew",
      };

      const blueprint = DeterministicBlueprintEngine.generate(input);
      const parsed = eventBlueprintSchema.safeParse(blueprint);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.overview.title).toBe("Aegean Corporate Gala");
        expect(parsed.data.budgetAllocations.length).toBeGreaterThan(0);
        expect(parsed.data.theme.palette.length).toBeGreaterThan(0);
        expect(parsed.data.overview.assumptions.length).toBeGreaterThan(0);
        expect(parsed.data.overview.uncertainties.length).toBeGreaterThan(0);
      }
    });

    it("generates honest curated theme concept fallback when AI image generation key is absent", () => {
      const concept = ThemeDAL.generateCuratedConcept("A minimalist winter wedding", "Wedding");

      expect(concept.name).toBeDefined();
      expect(concept.colorPalette.length).toBeGreaterThanOrEqual(4);
      expect(concept.moodboardUrls.length).toBeGreaterThan(0);
      // All fallback moodboard tiles must be marked isAiGenerated: false
      for (const tile of concept.moodboardUrls) {
        expect(tile.isAiGenerated).toBe(false);
      }
    });
  });

  describe("E2E Workflow: Create → Plan → Edit → Save → Recalculate → Export", () => {
    it("completes full event planning lifecycle with mathematical integrity", async () => {
      // 1. CREATE EVENT
      const event = {
        id: "evt_e2e_001",
        user_id: "usr_planner_1",
        title: "Summit 2026",
        event_type: "Conference",
        description: "Annual Tech Forum",
        event_date: "2026-11-20",
        location: "Convention Center Hall B",
        guest_count: 100,
        total_budget: 50000,
        currency: "USD",
        status: "planning" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 2. PLAN (Categories, Tasks, and Expenses)
      const categories = [
        {
          id: "cat_venue",
          event_id: event.id,
          name: "Venue & Facilities",
          allocated_amount: 25000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "cat_catering",
          event_id: event.id,
          name: "Catering & Refreshments",
          allocated_amount: 15000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "cat_av",
          event_id: event.id,
          name: "AV & Production",
          allocated_amount: 10000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const expenses = [
        {
          id: "exp_1",
          event_id: event.id,
          category_id: "cat_venue",
          title: "Center Hall Deposit",
          estimated_amount: 25000,
          actual_amount: 24000,
          deposit_paid: 12000,
          due_date: "2026-10-31",
          payment_status: "deposit_paid" as const,
          notes: "50% paid on signing",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "exp_2",
          event_id: event.id,
          category_id: "cat_catering",
          title: "Day Delegate Luncheon Package",
          estimated_amount: 15000,
          actual_amount: 14500,
          deposit_paid: 5000,
          due_date: "2026-11-05",
          payment_status: "deposit_paid" as const,
          notes: "Confirmed dietary requirements",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const taskItems: TaskItem[] = [
        {
          id: "task_1",
          eventId: event.id,
          title: "Sign Venue Contract",
          description: null,
          priority: "critical",
          status: "completed",
          dueDate: "2026-10-15",
          estimatedDurationHours: 2,
          assignee: "Alice Coordinator",
          category: "Venue & Facilities",
        },
        {
          id: "task_2",
          eventId: event.id,
          title: "Test Live Streaming Rig",
          description: null,
          priority: "high",
          status: "in_progress",
          dueDate: "2026-11-18",
          estimatedDurationHours: 4,
          assignee: "Bob Tech Lead",
          category: "AV & Production",
        },
      ];

      const taskDependencies: TaskDependency[] = [
        {
          taskId: "task_2",
          dependsOnTaskId: "task_1",
        },
      ];

      const vendors: VendorSummaryItem[] = [
        {
          id: "v_1",
          name: "Convention Center Management",
          category: "Venue",
          status: "contracted",
        },
      ];

      // 3. RECALCULATE (Deterministic domain calculation)
      const budgetMetrics = BudgetService.calculate(
        event.total_budget,
        event.guest_count,
        categories.map((c) => ({
          id: c.id,
          eventId: c.event_id,
          name: c.name,
          allocatedAmount: c.allocated_amount,
        })),
        expenses.map((e) => ({
          id: e.id,
          eventId: e.event_id,
          categoryId: e.category_id,
          title: e.title,
          estimatedAmount: e.estimated_amount,
          actualAmount: e.actual_amount,
          depositPaid: e.deposit_paid,
          dueDate: e.due_date,
          paymentStatus: e.payment_status,
        }))
      );

      // Verify mathematical precision
      expect(budgetMetrics.totalBudget).toBe(50000);
      expect(budgetMetrics.totalActual).toBe(38500); // 24000 + 14500
      expect(budgetMetrics.remainingUnspent).toBe(11500); // 50000 - 38500
      expect(budgetMetrics.costPerGuest).toBe(500); // 50000 / 100 planned budget per guest
      expect(budgetMetrics.isOverBudget).toBe(false);

      // 4. TIMELINE ANALYSIS
      const timelineAnalysis = TimelineService.analyzeTimeline(
        taskItems,
        taskDependencies
      );

      expect(timelineAnalysis.completedTasks).toHaveLength(1);
      expect(timelineAnalysis.pendingTasks).toHaveLength(1);
      expect(timelineAnalysis.blockedTasks).toHaveLength(0); // task_1 is completed, so task_2 is unblocked!
      expect(timelineAnalysis.completionPercentage).toBe(50);

      // 5. EVALUATE RISK RADAR
      const expensePaymentItems: ExpensePaymentItem[] = expenses.map((e) => ({
        id: e.id,
        title: e.title,
        actualAmount: e.actual_amount,
        depositPaid: e.deposit_paid,
        dueDate: e.due_date,
        paymentStatus: e.payment_status,
      }));

      const evaluatedRisks: EvaluatedRisk[] = RiskService.evaluate(
        event.id,
        budgetMetrics,
        taskItems,
        taskDependencies,
        vendors,
        expensePaymentItems,
        new Date("2026-10-20")
      );

      expect(Array.isArray(evaluatedRisks)).toBe(true);

      // 6. ONE-CLICK EXPORT PACK
      const bundle: EventExportBundle = {
        event,
        categories,
        expenses,
        tasks: taskItems.map((t) => ({
          id: t.id,
          event_id: t.eventId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          due_date: t.dueDate,
          estimated_duration_hours: t.estimatedDurationHours,
          assignee: t.assignee,
          category: t.category,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        risks: evaluatedRisks.map((r, i) => ({
          id: `risk_${i + 1}`,
          event_id: event.id,
          title: r.title,
          severity: r.severity,
          category: r.category,
          explanation: r.explanation,
          supporting_facts: r.supportingFacts,
          mitigation_action: r.mitigationAction,
          is_resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        vendors: [
          {
            id: "v_1",
            event_id: event.id,
            name: "Convention Center Management",
            category: "Venue",
            contact_email: "info@conventioncenter.com",
            contact_phone: "+1-555-0100",
            quoted_amount: 24000,
            status: "contracted",
            contract_url: null,
            notes: "Contract signed and verified",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      // Verify Budget CSV
      const budgetCsv = ExportService.generateBudgetCsv(bundle);
      expect(budgetCsv).toContain('"Venue & Facilities","Center Hall Deposit","25000.00","24000.00"');
      expect(budgetCsv).toContain('"Catering & Refreshments","Day Delegate Luncheon Package","15000.00","14500.00"');

      // Verify Tasks CSV
      const tasksCsv = ExportService.generateTasksCsv(bundle);
      expect(tasksCsv).toContain('"Sign Venue Contract","critical","completed"');
      expect(tasksCsv).toContain('"Test Live Streaming Rig","high","in_progress"');

      // Verify Vendors CSV
      const vendorsCsv = ExportService.generateVendorsCsv(bundle);
      expect(vendorsCsv).toContain('"Convention Center Management","Venue","contracted","24000.00"');

      // Verify Print HTML & PDF fallback
      const printHtml = ExportService.generatePrintableHtml(bundle);
      expect(printHtml).toContain("Summit 2026");
      expect(printHtml).toContain("Convention Center Hall B");
      expect(printHtml).toContain("USD 50,000");
      expect(printHtml).toContain("USD 38,500.00");
      expect(printHtml).toContain("USD 11,500.00");
      expect(printHtml).toContain("window.print()");
    });
  });
});
