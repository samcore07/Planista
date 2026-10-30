import { describe, it, expect } from "vitest";
import { LogisticsService } from "../logistics.service";
import { TaskItem, TaskDependency } from "../timeline.service";
import { BudgetCategoryRow, ExpenseRow } from "@/lib/dal/budget.dal";
import { RiskRow } from "@/lib/dal/risk.dal";

describe("LogisticsService - Critical Path Method (CPM)", () => {
  const sampleTasks: TaskItem[] = [
    {
      id: "t1",
      eventId: "e1",
      title: "Venue Contract",
      description: null,
      dueDate: "2026-11-01",
      priority: "critical",
      status: "completed",
      assignee: null,
      category: "Venue",
      estimatedDurationHours: 4.0,
    },
    {
      id: "t2",
      eventId: "e1",
      title: "Catering Tasting",
      description: null,
      dueDate: "2026-11-15",
      priority: "high",
      status: "pending",
      assignee: null,
      category: "Catering",
      estimatedDurationHours: 3.0,
    },
    {
      id: "t3",
      eventId: "e1",
      title: "Floral Design",
      description: null,
      dueDate: "2026-11-20",
      priority: "medium",
      status: "pending",
      assignee: null,
      category: "Decor",
      estimatedDurationHours: 2.0,
    },
    {
      id: "t4",
      eventId: "e1",
      title: "Day-of Run Sheet",
      description: null,
      dueDate: "2026-11-28",
      priority: "critical",
      status: "pending",
      assignee: null,
      category: "Operations",
      estimatedDurationHours: 3.5,
    },
  ];

  // Dependencies:
  // t1 -> t2 -> t4 (Total duration = 4.0 + 3.0 + 3.5 = 10.5 hrs)
  // t1 -> t3 -> t4 (Total duration = 4.0 + 2.0 + 3.5 = 9.5 hrs)
  // Critical Path should be: t1 -> t2 -> t4 (10.5 hrs), and t3 should have 1.0 hr slack!
  const sampleDependencies: TaskDependency[] = [
    { taskId: "t2", dependsOnTaskId: "t1" },
    { taskId: "t3", dependsOnTaskId: "t1" },
    { taskId: "t4", dependsOnTaskId: "t2" },
    { taskId: "t4", dependsOnTaskId: "t3" },
  ];

  it("correctly identifies the critical path and calculates slack", () => {
    const analysis = LogisticsService.analyzeCriticalPath(sampleTasks, sampleDependencies);

    expect(analysis.totalProjectDurationHours).toBe(10.5);

    const criticalIds = analysis.criticalPath.map((t) => t.id);
    expect(criticalIds).toContain("t1");
    expect(criticalIds).toContain("t2");
    expect(criticalIds).toContain("t4");

    // t3 is not on critical path and has slack
    expect(criticalIds).not.toContain("t3");
    const t3Task = analysis.allTasks.find((t) => t.id === "t3");
    expect(t3Task?.totalSlack).toBe(1.0);
    expect(t3Task?.isCritical).toBe(false);
  });

  it("evaluates live operational readiness score accurately", () => {
    const analysis = LogisticsService.analyzeCriticalPath(sampleTasks, sampleDependencies);
    const mockCategories: BudgetCategoryRow[] = [
      { id: "c1", event_id: "e1", name: "Venue", allocated_amount: 50000, created_at: "", updated_at: "" },
    ];
    const mockExpenses: ExpenseRow[] = [
      {
        id: "ex1",
        event_id: "e1",
        category_id: "c1",
        title: "Deposit",
        estimated_amount: 25000,
        actual_amount: 20000,
        deposit_paid: 20000,
        payment_status: "fully_paid",
        due_date: null,
        notes: null,
        created_at: "",
        updated_at: "",
      },
    ];
    const mockRisks: RiskRow[] = [
      {
        id: "r1",
        event_id: "e1",
        title: "Bad weather",
        explanation: "Potential outdoor rain",
        severity: "low",
        category: "Weather",
        supporting_facts: [],
        mitigation_action: "Indoor tent",
        is_resolved: true,
        created_at: "",
        updated_at: "",
      },
    ];

    const report = LogisticsService.evaluateReadiness(
      sampleTasks,
      analysis,
      mockCategories,
      mockExpenses,
      mockRisks
    );

    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.dimensions.length).toBe(4);
    expect(report.tier).toBeDefined();
  });

  it("generates structured resource heatmap data", () => {
    const heatmap = LogisticsService.generateResourceHeatmap(sampleTasks, "2026-12-01");
    expect(heatmap.categories.length).toBeGreaterThan(0);
    expect(heatmap.phases.length).toBe(5);
    expect(heatmap.matrix.length).toBe(heatmap.categories.length);
  });

  it("calculates discipline breakdown accurately", () => {
    const breakdown = LogisticsService.getDisciplineBreakdown(sampleTasks);
    expect(breakdown.length).toBe(4); // Venue, Catering, Decor, Operations
    const totalPercentage = breakdown.reduce((sum, b) => sum + b.percentage, 0);
    expect(totalPercentage).toBeGreaterThanOrEqual(95); // sum around 100%
  });

  it("computes topological layout for dependency graph", () => {
    const graph = LogisticsService.layoutDependencyGraph(
      sampleTasks,
      sampleDependencies,
      new Set(["t1", "t2", "t4"])
    );

    expect(graph.nodes.length).toBe(4);
    expect(graph.edges.length).toBe(4);
    expect(graph.width).toBeGreaterThan(0);
    expect(graph.height).toBeGreaterThan(0);
  });

  it("handles duplicate dependency edges and self-dependencies gracefully", () => {
    const redundantDeps: TaskDependency[] = [
      { taskId: "t2", dependsOnTaskId: "t1" },
      { taskId: "t2", dependsOnTaskId: "t1" }, // Duplicate edge
      { taskId: "t3", dependsOnTaskId: "t3" }, // Self-dependency
    ];

    const analysis = LogisticsService.analyzeCriticalPath(sampleTasks, redundantDeps);
    expect(analysis.allTasks.length).toBe(4);
    expect(analysis.totalProjectDurationHours).toBeGreaterThan(0);
  });

  it("handles empty task list in CPM analysis and graph layout", () => {
    const emptyAnalysis = LogisticsService.analyzeCriticalPath([], []);
    expect(emptyAnalysis.allTasks).toEqual([]);
    expect(emptyAnalysis.criticalPath).toEqual([]);
    expect(emptyAnalysis.totalProjectDurationHours).toBe(0);

    const emptyGraph = LogisticsService.layoutDependencyGraph([], [], new Set());
    expect(emptyGraph.nodes).toEqual([]);
    expect(emptyGraph.edges).toEqual([]);
  });
});
