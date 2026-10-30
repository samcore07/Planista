import { TaskItem, TaskDependency } from "../timeline.service";
import { CriticalPathAnalysis, CriticalPathTask } from "./logistics.types";

export class CriticalPathCalculator {
  /**
   * Computes Critical Path Method (CPM) with Early/Late start & finish and Slack/Float.
   * Hardened against duplicate dependency edges and direct self-loops.
   */
  static analyze(
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

    // Deduplicate dependency edges to prevent in-degree inflation
    const seenEdges = new Set<string>();
    for (const dep of dependencies) {
      if (dep.taskId === dep.dependsOnTaskId) continue; // skip self-loops
      if (taskMap.has(dep.taskId) && taskMap.has(dep.dependsOnTaskId)) {
        const edgeKey = `${dep.dependsOnTaskId}->${dep.taskId}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          predMap.get(dep.taskId)?.push(dep.dependsOnTaskId);
          succMap.get(dep.dependsOnTaskId)?.push(dep.taskId);
        }
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
}
