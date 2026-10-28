import { TaskItem, TaskDependency } from "./timeline.service";
import { BudgetCategoryRow, ExpenseRow } from "@/lib/dal/budget.dal";
import { RiskRow } from "@/lib/dal/risk.dal";

export interface CriticalPathTask extends TaskItem {
  durationHours: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalSlack: number;
  freeSlack: number;
  isCritical: boolean;
  predecessorIds: string[];
  successorIds: string[];
}

export interface CriticalPathAnalysis {
  criticalPath: CriticalPathTask[];
  allTasks: CriticalPathTask[];
  totalProjectDurationHours: number;
  criticalTaskCount: number;
  nonCriticalTaskCount: number;
  averageSlackHours: number;
}

export interface ReadinessDimension {
  name: string;
  weight: number;
  score: number; // 0 - 100
  status: "optimal" | "good" | "warning" | "critical";
  metric: string;
  detail: string;
}

export interface OperationalReadinessReport {
  overallScore: number; // 0 - 100
  tier: "Launch Ready" | "Operational" | "Elevated Attention" | "Critical Bottlenecks";
  tierColor: string;
  tierBadgeClass: string;
  summary: string;
  dimensions: ReadinessDimension[];
}

export interface HeatmapCell {
  category: string;
  phaseId: string;
  phaseLabel: string;
  taskCount: number;
  totalHours: number;
  intensity: number; // 0 to 100% relative to peak cell
  tasks: { id: string; title: string; priority: string; hours: number; status: string }[];
}

export interface ResourceHeatmap {
  categories: string[];
  phases: { id: string; label: string; range: string }[];
  matrix: HeatmapCell[][];
  peakHours: number;
}

export interface DisciplineBreakdownItem {
  category: string;
  taskCount: number;
  completedCount: number;
  totalHours: number;
  completedHours: number;
  percentage: number;
  color: string;
}

export interface DependencyGraphNode {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "blocked";
  category: string;
  durationHours: number;
  isCritical: boolean;
  slackHours: number;
  level: number; // topological column level (0, 1, 2, ...)
  row: number; // vertical index in level
  x: number;
  y: number;
}

export interface DependencyGraphEdge {
  fromId: string;
  toId: string;
  isCritical: boolean;
  pathD: string;
}

export interface DependencyGraphData {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  width: number;
  height: number;
}

const DISCIPLINE_COLORS = [
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Orange
];

export class LogisticsService {
  /**
   * Computes Critical Path Method (CPM) with Early/Late start & finish and Slack/Float
   */
  static analyzeCriticalPath(
    tasks: TaskItem[],
    dependencies: TaskDependency[]
  ): CriticalPathAnalysis {
    if (tasks.length === 0) {
      return {
        criticalPath: [],
        allTasks: [],
        totalProjectDurationHours: 0,
        criticalTaskCount: 0,
        nonCriticalTaskCount: 0,
        averageSlackHours: 0,
      };
    }

    const taskMap = new Map<string, TaskItem>(tasks.map((t) => [t.id, t]));
    const predMap = new Map<string, string[]>();
    const succMap = new Map<string, string[]>();

    for (const t of tasks) {
      predMap.set(t.id, []);
      succMap.set(t.id, []);
    }

    for (const dep of dependencies) {
      if (taskMap.has(dep.taskId) && taskMap.has(dep.dependsOnTaskId)) {
        predMap.get(dep.taskId)?.push(dep.dependsOnTaskId);
        succMap.get(dep.dependsOnTaskId)?.push(dep.taskId);
      }
    }

    // Topological sorting (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    for (const t of tasks) {
      inDegree.set(t.id, (predMap.get(t.id) || []).length);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const topoOrder: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      topoOrder.push(curr);
      for (const succ of succMap.get(curr) || []) {
        const nextDeg = (inDegree.get(succ) || 1) - 1;
        inDegree.set(succ, nextDeg);
        if (nextDeg === 0) queue.push(succ);
      }
    }

    // Fallback if cycles or unvisited nodes exist
    for (const t of tasks) {
      if (!topoOrder.includes(t.id)) {
        topoOrder.push(t.id);
      }
    }

    // 1. Forward Pass: Compute Early Start (ES) and Early Finish (EF)
    const es = new Map<string, number>();
    const ef = new Map<string, number>();

    for (const id of topoOrder) {
      const task = taskMap.get(id)!;
      const duration = Number(task.estimatedDurationHours) || 2.0;
      const preds = predMap.get(id) || [];

      let maxPredEf = 0;
      for (const pId of preds) {
        maxPredEf = Math.max(maxPredEf, ef.get(pId) || 0);
      }

      const earlyStart = maxPredEf;
      const earlyFinish = earlyStart + duration;

      es.set(id, earlyStart);
      ef.set(id, earlyFinish);
    }

    const totalDuration = Math.max(0, ...Array.from(ef.values()));

    // 2. Backward Pass: Compute Late Finish (LF) and Late Start (LS)
    const ls = new Map<string, number>();
    const lf = new Map<string, number>();

    const reverseTopo = [...topoOrder].reverse();
    for (const id of reverseTopo) {
      const task = taskMap.get(id)!;
      const duration = Number(task.estimatedDurationHours) || 2.0;
      const succs = succMap.get(id) || [];

      let minSuccLs = totalDuration;
      if (succs.length > 0) {
        minSuccLs = Math.min(...succs.map((sId) => ls.get(sId) ?? totalDuration));
      }

      const lateFinish = minSuccLs;
      const lateStart = lateFinish - duration;

      lf.set(id, lateFinish);
      ls.set(id, lateStart);
    }

    // 3. Compute Slack / Float and Identify Critical Path
    const allCalculated: CriticalPathTask[] = tasks.map((task) => {
      const duration = Number(task.estimatedDurationHours) || 2.0;
      const earlyStart = es.get(task.id) ?? 0;
      const earlyFinish = ef.get(task.id) ?? duration;
      const lateStart = ls.get(task.id) ?? 0;
      const lateFinish = lf.get(task.id) ?? duration;

      // Slack cannot be negative in standard scheduling without mandatory target dates
      const totalSlack = Math.max(0, Math.round((lateStart - earlyStart) * 10) / 10);

      const succs = succMap.get(task.id) || [];
      let minSuccEs = totalDuration;
      if (succs.length > 0) {
        minSuccEs = Math.min(...succs.map((sId) => es.get(sId) ?? totalDuration));
      }
      const freeSlack = Math.max(0, Math.round((minSuccEs - earlyFinish) * 10) / 10);

      // Tasks with 0 slack are critical to the project completion date
      const isCritical = totalSlack <= 0.05;

      return {
        ...task,
        durationHours: duration,
        earlyStart,
        earlyFinish,
        lateStart,
        lateFinish,
        totalSlack,
        freeSlack,
        isCritical,
        predecessorIds: predMap.get(task.id) || [],
        successorIds: succMap.get(task.id) || [],
      };
    });

    const criticalPath = allCalculated
      .filter((t) => t.isCritical)
      .sort((a, b) => a.earlyStart - b.earlyStart);

    const criticalTaskCount = criticalPath.length;
    const nonCriticalTaskCount = allCalculated.length - criticalTaskCount;
    const averageSlackHours =
      allCalculated.length > 0
        ? Math.round(
            (allCalculated.reduce((sum, t) => sum + t.totalSlack, 0) /
              allCalculated.length) *
              10
          ) / 10
        : 0;

    return {
      criticalPath,
      allTasks: allCalculated,
      totalProjectDurationHours: totalDuration,
      criticalTaskCount,
      nonCriticalTaskCount,
      averageSlackHours,
    };
  }

  /**
   * Evaluates multidimensional Live Operational Readiness (0-100%)
   */
  static evaluateReadiness(
    tasks: TaskItem[],
    criticalAnalysis: CriticalPathAnalysis,
    categories: BudgetCategoryRow[],
    expenses: ExpenseRow[],
    risks: RiskRow[]
  ): OperationalReadinessReport {
    // 1. Milestone & Task Health (Weight 30%)
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
    let milestoneScore = 100;

    if (totalTasks > 0) {
      const completionRatio = completedTasks / totalTasks;
      milestoneScore = Math.round(completionRatio * 85 + 15);
      if (blockedTasks > 0) {
        milestoneScore = Math.max(10, milestoneScore - blockedTasks * 12);
      }
    }

    const milestoneDim: ReadinessDimension = {
      name: "Milestone Velocity",
      weight: 0.3,
      score: milestoneScore,
      status: milestoneScore >= 80 ? "optimal" : milestoneScore >= 60 ? "good" : "warning",
      metric: `${completedTasks}/${totalTasks} Tasks (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100}%)`,
      detail: blockedTasks > 0 ? `${blockedTasks} task(s) currently blocked by dependencies` : "All active milestones progressing unblocked",
    };

    // 2. Critical Path Clearance (Weight 30%)
    const critTasks = criticalAnalysis.criticalPath;
    let critScore = 100;
    if (critTasks.length > 0) {
      const critCompleted = critTasks.filter((t) => t.status === "completed").length;
      const critBlocked = critTasks.filter((t) => t.status === "blocked").length;
      critScore = Math.round((critCompleted / critTasks.length) * 70 + 30);
      if (critBlocked > 0) {
        critScore = Math.max(5, critScore - critBlocked * 25);
      }
    }

    const critDim: ReadinessDimension = {
      name: "Critical Path Clearance",
      weight: 0.3,
      score: critScore,
      status: critScore >= 80 ? "optimal" : critScore >= 60 ? "good" : "critical",
      metric: `${critTasks.length} Critical Milestones`,
      detail: `${criticalAnalysis.totalProjectDurationHours} hrs minimum critical duration sequence`,
    };

    // 3. Fiscal Health & Expense Settlement (Weight 25%)
    let fiscalScore = 95;
    const totalBudget = categories.reduce((sum, c) => sum + Number(c.allocated_amount || 0), 0);
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.actual_amount || 0), 0);

    if (totalBudget > 0 && totalSpent > totalBudget) {
      const overrunPct = ((totalSpent - totalBudget) / totalBudget) * 100;
      fiscalScore = Math.max(20, Math.round(100 - overrunPct * 2));
    } else if (totalBudget > 0) {
      fiscalScore = 95;
    }

    const fiscalDim: ReadinessDimension = {
      name: "Fiscal Adherence",
      weight: 0.25,
      score: fiscalScore,
      status: fiscalScore >= 85 ? "optimal" : fiscalScore >= 70 ? "good" : "warning",
      metric: totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% Budget Used` : "Balanced",
      detail: totalSpent > totalBudget ? `Exceeds allocation by ₹${Math.round(totalSpent - totalBudget).toLocaleString("en-IN")}` : "Within designated envelope",
    };

    // 4. Risk Mitigation (Weight 15%)
    let riskScore = 90;
    const highRisks = risks.filter((r) => r.severity === "high" || r.severity === "critical");
    const openHighRisks = highRisks.filter((r) => !r.is_resolved);

    if (openHighRisks.length > 0) {
      riskScore = Math.max(25, 90 - openHighRisks.length * 20);
    }

    const riskDim: ReadinessDimension = {
      name: "Risk Mitigation",
      weight: 0.15,
      score: riskScore,
      status: riskScore >= 80 ? "optimal" : riskScore >= 55 ? "good" : "warning",
      metric: `${openHighRisks.length} High Risks Open`,
      detail: openHighRisks.length > 0 ? "Mitigation contingency plan required" : "All identified threats mitigated or contained",
    };

    const overallScore = Math.round(
      milestoneDim.score * milestoneDim.weight +
      critDim.score * critDim.weight +
      fiscalDim.score * fiscalDim.weight +
      riskDim.score * riskDim.weight
    );

    let tier: OperationalReadinessReport["tier"] = "Launch Ready";
    let tierColor = "#10B981";
    let tierBadgeClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    let summary = "All production disciplines and critical milestones demonstrate high operational integrity.";

    if (overallScore < 50) {
      tier = "Critical Bottlenecks";
      tierColor = "#EF4444";
      tierBadgeClass = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
      summary = "Immediate operational intervention required: critical path blockages or fiscal overruns present.";
    } else if (overallScore < 70) {
      tier = "Elevated Attention";
      tierColor = "#F59E0B";
      tierBadgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
      summary = "Pacing is viable but prerequisite bottlenecks or unresolved risks require active mitigation.";
    } else if (overallScore < 85) {
      tier = "Operational";
      tierColor = "#3B82F6";
      tierBadgeClass = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
      summary = "Steady operational execution. Core logistics are aligned with anticipated milestone delivery.";
    }

    return {
      overallScore,
      tier,
      tierColor,
      tierBadgeClass,
      summary,
      dimensions: [milestoneDim, critDim, fiscalDim, riskDim],
    };
  }

  /**
   * Generates Resource Utilization Heatmap data by Category and Timeline Phase
   */
  static generateResourceHeatmap(
    tasks: TaskItem[],
    eventDateStr?: string | null
  ): ResourceHeatmap {
    const phases = [
      { id: "p1", label: "Early Blueprint", range: "> 60 Days" },
      { id: "p2", label: "Core Procurement", range: "30 - 60 Days" },
      { id: "p3", label: "Production Prep", range: "14 - 30 Days" },
      { id: "p4", label: "Final Rehearsal", range: "3 - 14 Days" },
      { id: "p5", label: "Zero-Hour Delivery", range: "< 3 Days" },
    ];

    // Collect distinct categories
    const categorySet = new Set<string>();
    for (const t of tasks) {
      categorySet.add(t.category || "General");
    }
    const categories = Array.from(categorySet);
    if (categories.length === 0) categories.push("General Operations");

    const eventTime = eventDateStr ? new Date(eventDateStr).getTime() : Date.now() + 90 * 86400000;

    // Helper to bucket a task into a phase
    const getPhaseId = (t: TaskItem): string => {
      if (!t.dueDate) return "p2";
      const dueTime = new Date(t.dueDate).getTime();
      const daysUntilEvent = Math.max(0, Math.round((eventTime - dueTime) / 86400000));

      if (daysUntilEvent > 60) return "p1";
      if (daysUntilEvent >= 30) return "p2";
      if (daysUntilEvent >= 14) return "p3";
      if (daysUntilEvent >= 3) return "p4";
      return "p5";
    };

    // Calculate matrix
    let maxCellHours = 1;
    const matrix: HeatmapCell[][] = categories.map((cat) => {
      return phases.map((phase) => {
        const matchingTasks = tasks.filter(
          (t) => (t.category || "General") === cat && getPhaseId(t) === phase.id
        );

        const totalHours = matchingTasks.reduce(
          (sum, t) => sum + (Number(t.estimatedDurationHours) || 2.0),
          0
        );

        if (totalHours > maxCellHours) maxCellHours = totalHours;

        return {
          category: cat,
          phaseId: phase.id,
          phaseLabel: phase.label,
          taskCount: matchingTasks.length,
          totalHours: Math.round(totalHours * 10) / 10,
          intensity: 0, // calculated below
          tasks: matchingTasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            hours: Number(t.estimatedDurationHours) || 2.0,
            status: t.status,
          })),
        };
      });
    });

    // Populate intensity percentages
    for (const row of matrix) {
      for (const cell of row) {
        cell.intensity = maxCellHours > 0 ? Math.round((cell.totalHours / maxCellHours) * 100) : 0;
      }
    }

    return {
      categories,
      phases,
      matrix,
      peakHours: Math.round(maxCellHours * 10) / 10,
    };
  }

  /**
   * Computes work breakdown by discipline for Donut and Bar charts
   */
  static getDisciplineBreakdown(tasks: TaskItem[]): DisciplineBreakdownItem[] {
    const categoryMap = new Map<string, { totalHours: number; completedHours: number; count: number; completedCount: number }>();

    let grandTotalHours = 0;

    for (const t of tasks) {
      const cat = t.category || "General";
      const hours = Number(t.estimatedDurationHours) || 2.0;
      grandTotalHours += hours;

      const current = categoryMap.get(cat) || { totalHours: 0, completedHours: 0, count: 0, completedCount: 0 };
      current.totalHours += hours;
      current.count += 1;
      if (t.status === "completed") {
        current.completedHours += hours;
        current.completedCount += 1;
      }
      categoryMap.set(cat, current);
    }

    let colorIdx = 0;
    const result: DisciplineBreakdownItem[] = [];

    for (const [category, data] of categoryMap.entries()) {
      const percentage = grandTotalHours > 0 ? Math.round((data.totalHours / grandTotalHours) * 100) : 0;
      result.push({
        category,
        taskCount: data.count,
        completedCount: data.completedCount,
        totalHours: Math.round(data.totalHours * 10) / 10,
        completedHours: Math.round(data.completedHours * 10) / 10,
        percentage,
        color: DISCIPLINE_COLORS[colorIdx % DISCIPLINE_COLORS.length],
      });
      colorIdx++;
    }

    return result.sort((a, b) => b.totalHours - a.totalHours);
  }

  /**
   * Generates graph layout coordinates for the Dependency Flowchart
   */
  static layoutDependencyGraph(
    tasks: TaskItem[],
    dependencies: TaskDependency[],
    criticalTaskIds: Set<string>
  ): DependencyGraphData {
    if (tasks.length === 0) {
      return { nodes: [], edges: [], width: 800, height: 400 };
    }

    const taskMap = new Map<string, TaskItem>(tasks.map((t) => [t.id, t]));
    const predMap = new Map<string, string[]>();
    const succMap = new Map<string, string[]>();

    for (const t of tasks) {
      predMap.set(t.id, []);
      succMap.set(t.id, []);
    }

    for (const dep of dependencies) {
      if (taskMap.has(dep.taskId) && taskMap.has(dep.dependsOnTaskId)) {
        predMap.get(dep.taskId)?.push(dep.dependsOnTaskId);
        succMap.get(dep.dependsOnTaskId)?.push(dep.taskId);
      }
    }

    // Assign level via longest path from roots (topological rank)
    const levelMap = new Map<string, number>();

    function getLevel(id: string, visited: Set<string> = new Set()): number {
      if (levelMap.has(id)) return levelMap.get(id)!;
      if (visited.has(id)) return 0; // avoid cycle
      visited.add(id);

      const preds = predMap.get(id) || [];
      if (preds.length === 0) {
        levelMap.set(id, 0);
        return 0;
      }

      let maxPredLevel = 0;
      for (const p of preds) {
        maxPredLevel = Math.max(maxPredLevel, getLevel(p, new Set(visited)));
      }

      const myLevel = maxPredLevel + 1;
      levelMap.set(id, myLevel);
      return myLevel;
    }

    for (const t of tasks) {
      getLevel(t.id);
    }

    // Group tasks by level
    const levelBuckets = new Map<number, string[]>();
    for (const [id, lvl] of levelMap.entries()) {
      const bucket = levelBuckets.get(lvl) || [];
      bucket.push(id);
      levelBuckets.set(lvl, bucket);
    }

    const maxLevel = Math.max(0, ...Array.from(levelBuckets.keys()));
    const colSpacing = 240;
    const rowSpacing = 90;
    const paddingX = 60;
    const paddingY = 60;

    const nodePositions = new Map<string, { x: number; y: number; level: number; row: number }>();

    let maxRowsInAnyLevel = 1;
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const ids = levelBuckets.get(lvl) || [];
      maxRowsInAnyLevel = Math.max(maxRowsInAnyLevel, ids.length);
      ids.forEach((id, rowIdx) => {
        const x = paddingX + lvl * colSpacing;
        const y = paddingY + rowIdx * rowSpacing;
        nodePositions.set(id, { x, y, level: lvl, row: rowIdx });
      });
    }

    const nodes: DependencyGraphNode[] = tasks.map((t) => {
      const pos = nodePositions.get(t.id) || { x: paddingX, y: paddingY, level: 0, row: 0 };
      const isCritical = criticalTaskIds.has(t.id);
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        category: t.category || "General",
        durationHours: Number(t.estimatedDurationHours) || 2.0,
        isCritical,
        slackHours: isCritical ? 0 : 2.5,
        level: pos.level,
        row: pos.row,
        x: pos.x,
        y: pos.y,
      };
    });

    // Create cubic bezier curved paths for edges
    const edges: DependencyGraphEdge[] = [];
    const nodeLookup = new Map<string, DependencyGraphNode>(nodes.map((n) => [n.id, n]));

    for (const dep of dependencies) {
      const source = nodeLookup.get(dep.dependsOnTaskId);
      const target = nodeLookup.get(dep.taskId);

      if (source && target) {
        const x1 = source.x + 160; // node card right edge
        const y1 = source.y + 24;  // node center vertical
        const x2 = target.x;       // node card left edge
        const y2 = target.y + 24;

        const dx = Math.max(40, (x2 - x1) * 0.5);
        const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        const isCritical = source.isCritical && target.isCritical;

        edges.push({
          fromId: source.id,
          toId: target.id,
          isCritical,
          pathD,
        });
      }
    }

    const graphWidth = Math.max(860, paddingX * 2 + (maxLevel + 1) * colSpacing);
    const graphHeight = Math.max(420, paddingY * 2 + maxRowsInAnyLevel * rowSpacing);

    return {
      nodes,
      edges,
      width: graphWidth,
      height: graphHeight,
    };
  }
}
