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
      completionPercentage,
    };
  }

  /**
   * Detects cycles in task dependencies
   */
  static detectCycle(dependencies: TaskDependency[]): boolean {
    const adj = new Map<string, string[]>();
    for (const dep of dependencies) {
      const list = adj.get(dep.dependsOnTaskId) || [];
      list.push(dep.taskId);
      adj.set(dep.dependsOnTaskId, list);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    function dfs(node: string): boolean {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recStack.delete(node);
      return false;
    }

    const allNodes = new Set<string>();
    for (const dep of dependencies) {
      allNodes.add(dep.taskId);
      allNodes.add(dep.dependsOnTaskId);
    }

    for (const node of allNodes) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }

    return false;
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
