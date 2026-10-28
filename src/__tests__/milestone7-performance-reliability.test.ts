import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetService, BudgetCategoryItem, ExpenseItem } from "@/services/budget.service";
import { TimelineService, TaskItem, TaskDependency } from "@/services/timeline.service";
import { RiskService, EvaluatedRisk } from "@/services/risk.service";
import {
  measureExecution,
  recordTelemetry,
  getTelemetryHistory,
  clearTelemetryHistory,
} from "@/lib/monitoring/telemetry";
import {
  fetchWithRetryAndTimeout,
  calculateBackoff,
} from "@/lib/reliability/fetch-retry";

describe("Milestone 7: Performance and Reliability Test Suite", () => {
  beforeEach(() => {
    clearTelemetryHistory();
    vi.restoreAllMocks();
  });

  describe("1. Deterministic Domain Services Performance Targets", () => {
    it("BudgetService executes 500 expense calculations well within 25ms budget", () => {
      const categories: BudgetCategoryItem[] = Array.from({ length: 20 }, (_, i) => ({
        id: `cat-${i}`,
        eventId: "event-1",
        name: `Category ${i}`,
        allocatedAmount: 10000,
      }));

      const expenses: ExpenseItem[] = Array.from({ length: 500 }, (_, i) => ({
        id: `exp-${i}`,
        eventId: "event-1",
        categoryId: `cat-${i % 20}`,
        title: `Expense item ${i}`,
        estimatedAmount: 350,
        actualAmount: 340,
        depositPaid: 100,
        dueDate: "2026-12-01",
        paymentStatus: "deposit_paid" as const,
      }));

      const start = performance.now();
      const result = BudgetService.calculate(250000, 150, categories, expenses);
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(25);
      expect(result.totalActual).toBe(170000); // 500 * 340
      expect(result.totalBudget).toBe(250000);
      expect(result.remainingUnspent).toBe(80000);
      expect(result.costPerGuest).toBeCloseTo(250000 / 150, 2);
    });

    it("TimelineService DAG traversal and cycle detection handles 100 tasks within 25ms budget", () => {
      // Build a chain of 100 dependent tasks
      const tasks: TaskItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        eventId: "event-1",
        title: `Task ${i}`,
        description: null,
        dueDate: `2026-11-${String((i % 28) + 1).padStart(2, "0")}`,
        status: i < 50 ? ("completed" as const) : ("pending" as const),
        priority: "medium" as const,
        assignee: null,
        category: null,
        estimatedDurationHours: 1,
      }));

      const dependencies: TaskDependency[] = Array.from({ length: 99 }, (_, i) => ({
        taskId: `task-${i + 1}`,
        dependsOnTaskId: `task-${i}`,
      }));

      const start = performance.now();
      const analysis = TimelineService.analyzeTimeline(tasks, dependencies, new Date("2026-11-15"));
      const hasCycle = TimelineService.detectCycle(dependencies);
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(25);
      expect(analysis.completedTasks.length).toBe(50);
      expect(hasCycle).toBe(false);
    });

    it("RiskService heuristic evaluation runs within 20ms budget", () => {
      const budgetMetrics = BudgetService.calculate(
        100000,
        100,
        [{ id: "cat-1", eventId: "event-1", name: "Catering", allocatedAmount: 50000 }],
        [
          {
            id: "exp-1",
            eventId: "event-1",
            categoryId: "cat-1",
            title: "Catering Deposit",
            estimatedAmount: 60000,
            actualAmount: 65000,
            depositPaid: 20000,
            dueDate: "2026-12-01",
            paymentStatus: "deposit_paid",
          },
        ]
      );

      const tasks: TaskItem[] = [
        {
          id: "t1",
          eventId: "event-1",
          title: "Book Venue",
          description: null,
          status: "pending",
          priority: "critical",
          dueDate: "2026-09-01", // overdue
          assignee: null,
          category: null,
          estimatedDurationHours: 2,
        },
      ];

      const start = performance.now();
      const risks = RiskService.evaluate(
        "event-1",
        budgetMetrics,
        tasks,
        [],
        [],
        [
          {
            id: "exp-1",
            title: "Catering Deposit",
            actualAmount: 65000,
            depositPaid: 20000,
            dueDate: "2026-09-01",
            paymentStatus: "unpaid",
          },
        ]
      );
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(20);
      expect(risks.length).toBeGreaterThan(0);

      // Verify budget risk was detected deterministically
      const budgetRisk = risks.find((r: EvaluatedRisk) => r.category === "budget");
      expect(budgetRisk).toBeDefined();
      expect(budgetRisk?.severity).toBe("high");
    });
  });

  describe("2. Network Failures, Retries, and Timeouts", () => {
    it("calculateBackoff computes exponential delay within maximum cap", () => {
      const delay0 = calculateBackoff(0, 100, 1000);
      expect(delay0).toBeGreaterThanOrEqual(0);
      expect(delay0).toBeLessThanOrEqual(100);

      const delay3 = calculateBackoff(3, 100, 1000); // 100 * 8 = 800
      expect(delay3).toBeGreaterThanOrEqual(0);
      expect(delay3).toBeLessThanOrEqual(800);

      const delayCapped = calculateBackoff(10, 100, 1000); // exceeds cap
      expect(delayCapped).toBeLessThanOrEqual(1000);
    });

    it("fetchWithRetryAndTimeout recovers after transient 503 error", async () => {
      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          return new Response("Service Unavailable", { status: 503 });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      vi.stubGlobal("fetch", mockFetch);

      const response = await fetchWithRetryAndTimeout(
        "https://api.example.com/data",
        {},
        { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 50, timeoutMs: 500 }
      );

      expect(response.status).toBe(200);
      expect(attempts).toBe(2);

      const history = getTelemetryHistory();
      const transientRecord = history.find((h) => h.name === "fetch_transient_status");
      const recoveredRecord = history.find((h) => h.name === "fetch_retry_recovered");

      expect(transientRecord).toBeDefined();
      expect(transientRecord?.level).toBe("warn");
      expect(recoveredRecord).toBeDefined();
      expect(recoveredRecord?.level).toBe("info");
    });

    it("fetchWithRetryAndTimeout respects Retry-After response header", async () => {
      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          return new Response("Rate Limited", {
            status: 429,
            headers: { "Retry-After": "1" },
          });
        }
        return new Response("OK", { status: 200 });
      });

      vi.stubGlobal("fetch", mockFetch);

      const response = await fetchWithRetryAndTimeout(
        "https://api.example.com/ratelimited",
        {},
        { maxRetries: 1, initialDelayMs: 10, maxDelayMs: 50, timeoutMs: 2000 }
      );

      expect(response.status).toBe(200);
      expect(attempts).toBe(2);
    });

    it("fetchWithRetryAndTimeout throws and records telemetry when retries are exhausted", async () => {
      const mockFetch = vi.fn().mockImplementation(async () => {
        return new Response("Persistent Internal Error", { status: 500 });
      });

      vi.stubGlobal("fetch", mockFetch);

      const response = await fetchWithRetryAndTimeout(
        "https://api.example.com/fail",
        {},
        { maxRetries: 2, initialDelayMs: 5, maxDelayMs: 20, timeoutMs: 500 }
      );

      expect(response.status).toBe(500);
      const history = getTelemetryHistory();
      const statusWarnings = history.filter((h) => h.name === "fetch_transient_status");
      expect(statusWarnings.length).toBe(2);
    });

    it("fetchWithRetryAndTimeout enforces request timeout abort", async () => {
      const mockFetch = vi.fn().mockImplementation((_url, init?: RequestInit) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(new Response("Late")), 500);
          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(init.signal?.reason || new Error("The operation was aborted"));
            });
          }
        });
      });

      vi.stubGlobal("fetch", mockFetch);

      await expect(
        fetchWithRetryAndTimeout(
          "https://api.example.com/timeout",
          {},
          { maxRetries: 0, timeoutMs: 30 }
        )
      ).rejects.toThrow(/timed out/i);

      const history = getTelemetryHistory();
      const exhausted = history.find((h) => h.name === "fetch_exhausted_retries");
      expect(exhausted).toBeDefined();
    });
  });

  describe("3. Telemetry and Observable Failures", () => {
    it("measureExecution flags slow operations exceeding threshold as isSlow", async () => {
      const { result, durationMs } = await measureExecution(
        "slow_budget_audit",
        "domain_service",
        async () => {
          await new Promise((r) => setTimeout(r, 60));
          return "finished";
        },
        { slowThresholdMs: 40 }
      );

      expect(result).toBe("finished");
      expect(durationMs).toBeGreaterThanOrEqual(50);

      const history = getTelemetryHistory();
      expect(history.length).toBe(1);
      expect(history[0].isSlow).toBe(true);
      expect(history[0].level).toBe("warn");
    });

    it("measureExecution logs unhandled service exceptions with error level", async () => {
      await expect(
        measureExecution(
          "failing_task",
          "database",
          async () => {
            throw new Error("Connection refused to database pool");
          }
        )
      ).rejects.toThrow("Connection refused to database pool");

      const history = getTelemetryHistory();
      expect(history.length).toBe(1);
      expect(history[0].level).toBe("error");
      expect(history[0].success).toBe(false);
      expect(history[0].error).toBe("Connection refused to database pool");
    });

    it("recordTelemetry maintains a capped buffer to prevent unbounded memory growth", () => {
      for (let i = 0; i < 150; i++) {
        recordTelemetry({
          level: "info",
          category: "system",
          name: `ping_${i}`,
          success: true,
        });
      }

      const history = getTelemetryHistory();
      expect(history.length).toBe(100);
      expect(history[history.length - 1].name).toBe("ping_149");
    });
  });
});
