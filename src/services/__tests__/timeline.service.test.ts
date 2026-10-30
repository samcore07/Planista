import { describe, it, expect } from "vitest";
import {
  TimelineService,
  TaskItem,
  TaskDependency,
} from "../timeline.service";

describe("TimelineService & Dependency Resolution", () => {
  const refDate = new Date("2026-10-27T00:00:00Z");

  const sampleTasks: TaskItem[] = [
    {
      id: "task-1",
      eventId: "ev-1",
      title: "Sign Venue Lease",
      description: null,
      dueDate: "2026-10-20T00:00:00Z", // In the past relative to refDate
      priority: "critical",
      status: "completed",
      assignee: null,
      category: "Venue",
      estimatedDurationHours: 4,
    },
    {
      id: "task-2",
      eventId: "ev-1",
      title: "Menu Tasting",
      description: null,
      dueDate: "2026-10-25T00:00:00Z", // In the past relative to refDate, not completed
      priority: "high",
      status: "in_progress",
      assignee: null,
      category: "Catering",
      estimatedDurationHours: 3,
    },
    {
      id: "task-3",
      eventId: "ev-1",
      title: "Final Guest Seating Confirmation",
      description: null,
      dueDate: "2026-11-10T00:00:00Z",
      priority: "high",
      status: "pending",
      assignee: null,
      category: "Coordination",
      estimatedDurationHours: 5,
    },
  ];

  it("identifies overdue tasks accurately", () => {
    const deps: TaskDependency[] = [
      { taskId: "task-2", dependsOnTaskId: "task-1" },
      { taskId: "task-3", dependsOnTaskId: "task-2" },
    ];

    const analysis = TimelineService.analyzeTimeline(sampleTasks, deps, refDate);

    expect(analysis.completedTasks).toHaveLength(1);
    expect(analysis.completedTasks[0]?.id).toBe("task-1");

    expect(analysis.overdueTasks).toHaveLength(1);
    expect(analysis.overdueTasks[0]?.id).toBe("task-2");

    // task-3 depends on task-2 which is in_progress (not completed), so task-3 is blocked!
    expect(analysis.blockedTasks.map((t) => t.id)).toContain("task-3");
    expect(analysis.completionPercentage).toBe(33); // 1 out of 3
  });

  it("detects circular dependencies", () => {
    const acyclicDeps: TaskDependency[] = [
      { taskId: "task-2", dependsOnTaskId: "task-1" },
      { taskId: "task-3", dependsOnTaskId: "task-2" },
    ];
    expect(TimelineService.detectCycle(acyclicDeps)).toBe(false);

    const cyclicDeps: TaskDependency[] = [
      { taskId: "task-2", dependsOnTaskId: "task-1" },
      { taskId: "task-3", dependsOnTaskId: "task-2" },
      { taskId: "task-1", dependsOnTaskId: "task-3" }, // Circle!
    ];
    expect(TimelineService.detectCycle(cyclicDeps)).toBe(true);
  });

  it("propagates delays to downstream dependent tasks", () => {
    const deps: TaskDependency[] = [
      { taskId: "task-2", dependsOnTaskId: "task-1" },
      { taskId: "task-3", dependsOnTaskId: "task-2" },
    ];

    // Delay task-1 by 7 days
    const impacts = TimelineService.propagateTaskDelay("task-1", 7, sampleTasks, deps);

    expect(impacts).toHaveLength(3); // task-1, task-2, and task-3 are impacted
    expect(impacts[0]?.taskId).toBe("task-1");
    expect(impacts[0]?.delayDays).toBe(7);

    // Verify task-2 new proposed date is original + 7 days
    const task2Impact = impacts.find((i) => i.taskId === "task-2");
    expect(task2Impact).toBeDefined();
    expect(task2Impact?.originalDueDate).toBe("2026-10-25T00:00:00Z");
    expect(new Date(task2Impact!.proposedDueDate).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("safely ignores non-finite delays and invalid date strings", () => {
    const deps: TaskDependency[] = [
      { taskId: "task-2", dependsOnTaskId: "task-1" },
    ];

    expect(TimelineService.propagateTaskDelay("task-1", Number.NaN, sampleTasks, deps)).toEqual([]);
    expect(TimelineService.propagateTaskDelay("task-1", Number.POSITIVE_INFINITY, sampleTasks, deps)).toEqual([]);
    expect(TimelineService.propagateTaskDelay("task-1", -3, sampleTasks, deps)).toEqual([]);

    const taskWithInvalidDate: TaskItem = {
      id: "task-bad-date",
      eventId: "ev-1",
      title: "Bad Date Task",
      description: null,
      dueDate: "not-a-valid-date-string",
      priority: "medium",
      status: "pending",
      assignee: null,
      category: null,
      estimatedDurationHours: 1,
    };

    expect(TimelineService.propagateTaskDelay("task-bad-date", 5, [taskWithInvalidDate], [])).toEqual([]);

    const analysis = TimelineService.analyzeTimeline([taskWithInvalidDate], [], refDate);
    expect(analysis.overdueTasks).toHaveLength(0);
  });
});
