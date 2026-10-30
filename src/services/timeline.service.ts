export interface TaskItem {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "blocked";
  assignee: string | null;
  category: string | null;
  estimatedDurationHours: number | null;
}

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
}

export interface DelayedTaskImpact {
  taskId: string;
  taskTitle: string;
  originalDueDate: string | null;
  proposedDueDate: string;
  delayDays: number;
  reason: string;
}

export interface TimelineAnalysisResult {
  overdueTasks: TaskItem[];
  blockedTasks: TaskItem[];
  completedTasks: TaskItem[];
  pendingTasks: TaskItem[];
  inProgressTasks: TaskItem[];
  completionPercentage: number;
}

export class TimelineService {
  /**
   * Analyzes tasks for overdue status, blocked status, and progress metrics
   */
  static analyzeTimeline(
    tasks: TaskItem[],
    dependencies: TaskDependency[],
    referenceDate: Date = new Date()
  ): TimelineAnalysisResult {
    const taskMap = new Map<string, TaskItem>(tasks.map((t) => [t.id, t]));

    // Map each task to the set of task IDs it depends on
    const prereqMap = new Map<string, string[]>();
    for (const dep of dependencies) {
      const list = prereqMap.get(dep.taskId) || [];
      list.push(dep.dependsOnTaskId);
      prereqMap.set(dep.taskId, list);
    }

    const overdueTasks: TaskItem[] = [];
    const blockedTasks: TaskItem[] = [];
    const completedTasks: TaskItem[] = [];
    const pendingTasks: TaskItem[] = [];
    const inProgressTasks: TaskItem[] = [];

    const nowTime = referenceDate.getTime();

    for (const task of tasks) {
      if (task.status === "completed") {
        completedTasks.push(task);
        continue;
      }

      // Check if blocked by an uncompleted prerequisite
      const prereqs = prereqMap.get(task.id) || [];
      const hasUnfinishedPrereq = prereqs.some((prereqId) => {
        const prereq = taskMap.get(prereqId);
        return !prereq || prereq.status !== "completed";
      });

      if (hasUnfinishedPrereq || task.status === "blocked") {
        blockedTasks.push({ ...task, status: "blocked" });
      } else {
        pendingTasks.push(task);
        if (task.status === "in_progress") {
          inProgressTasks.push(task);
        }
      }

      // Check overdue safely verifying valid timestamp
      if (task.dueDate) {
        const dueTime = new Date(task.dueDate).getTime();
        if (!Number.isNaN(dueTime) && dueTime < nowTime) {
          overdueTasks.push(task);
        }
      }
    }

    const total = tasks.length;
    const completionPercentage = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;

    return {
      overdueTasks,
      blockedTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      completionPercentage,
    };
  }

  /**
   * Detects circular dependencies using Kahn's topological sort algorithm.
   * Completely avoids recursion to prevent call-stack exhaustion on large dependency graphs.
   */
  static detectCycle(dependencies: TaskDependency[]): boolean {
    if (dependencies.length === 0) return false;

    // Direct self-dependency check
    for (const dep of dependencies) {
      if (dep.taskId === dep.dependsOnTaskId) return true;
    }

    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    const allNodes = new Set<string>();
    const seenEdges = new Set<string>();

    for (const dep of dependencies) {
      allNodes.add(dep.taskId);
      allNodes.add(dep.dependsOnTaskId);

      const edgeKey = `${dep.dependsOnTaskId}->${dep.taskId}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);

      const list = adj.get(dep.dependsOnTaskId) || [];
      list.push(dep.taskId);
      adj.set(dep.dependsOnTaskId, list);

      inDegree.set(dep.taskId, (inDegree.get(dep.taskId) || 0) + 1);
      if (!inDegree.has(dep.dependsOnTaskId)) {
        inDegree.set(dep.dependsOnTaskId, 0);
      }
    }

    const queue: string[] = [];
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    let visitedCount = 0;
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      visitedCount++;

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        const newDegree = (inDegree.get(v) || 0) - 1;
        inDegree.set(v, newDegree);
        if (newDegree === 0) {
          queue.push(v);
        }
      }
    }

    return visitedCount !== allNodes.size;
  }

  /**
   * Calculates downstream cascading schedule adjustments when a task is delayed
   */
  static propagateTaskDelay(
    delayedTaskId: string,
    delayDays: number,
    tasks: TaskItem[],
    dependencies: TaskDependency[]
  ): DelayedTaskImpact[] {
    if (!Number.isFinite(delayDays) || delayDays <= 0) return [];

    const taskMap = new Map<string, TaskItem>(tasks.map((t) => [t.id, t]));
    const delayedTask = taskMap.get(delayedTaskId);
    if (!delayedTask || !delayedTask.dueDate) return [];

    const origDueDateMs = new Date(delayedTask.dueDate).getTime();
    if (Number.isNaN(origDueDateMs)) return [];

    // Map predecessor -> downstream tasks
    const downstreamMap = new Map<string, string[]>();
    for (const dep of dependencies) {
      const list = downstreamMap.get(dep.dependsOnTaskId) || [];
      list.push(dep.taskId);
      downstreamMap.set(dep.dependsOnTaskId, list);
    }

    const impacts: DelayedTaskImpact[] = [];
    const queue: string[] = [delayedTaskId];
    const visited = new Set<string>();

    const delayMillis = delayDays * 24 * 60 * 60 * 1000;

    // Calculate new date for the originally delayed task
    const origNewDueDate = new Date(origDueDateMs + delayMillis);
    impacts.push({
      taskId: delayedTask.id,
      taskTitle: delayedTask.title,
      originalDueDate: delayedTask.dueDate,
      proposedDueDate: origNewDueDate.toISOString(),
      delayDays,
      reason: `Direct delay applied: +${delayDays} day(s)`,
    });

    visited.add(delayedTaskId);

    let head = 0;
    while (head < queue.length) {
      const currentId = queue[head++];
      if (!currentId) continue;
      const dependents = downstreamMap.get(currentId) || [];

      for (const depId of dependents) {
        if (!visited.has(depId)) {
          visited.add(depId);
          const depTask = taskMap.get(depId);
          if (depTask && depTask.dueDate) {
            const currentDueDateMs = new Date(depTask.dueDate).getTime();
            if (Number.isNaN(currentDueDateMs)) continue;
            const proposedDueDate = new Date(currentDueDateMs + delayMillis);

            impacts.push({
              taskId: depTask.id,
              taskTitle: depTask.title,
              originalDueDate: depTask.dueDate,
              proposedDueDate: proposedDueDate.toISOString(),
              delayDays,
              reason: `Downstream dependency of delayed task "${delayedTask.title}"`,
            });
            queue.push(depId);
          }
        }
      }
    }

    return impacts;
  }
}
