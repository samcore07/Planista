import { describe, it, expect } from "vitest";
import { createTaskSchema, updateTaskSchema, TasksDAL } from "../tasks.dal";
import { TimelineService, TaskItem, TaskDependency } from "@/services/timeline.service";

describe("Tasks DAL Schemas and Dependency Intelligence", () => {
  it("validates task creation input with valid priority and status", () => {
    const input = {
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Confirm Floral Layout",
      priority: "high" as const,
      status: "pending" as const,
      estimatedDurationHours: 4,
    };

    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(true);

    const updateResult = updateTaskSchema.safeParse({ priority: "critical", status: "in_progress" });
    expect(updateResult.success).toBe(true);
  });

  it("rejects empty titles or invalid priority values", () => {
    const emptyTitle = {
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      title: "",
    };
    expect(createTaskSchema.safeParse(emptyTitle).success).toBe(false);

    const invalidPriority = {
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Valid Title",
      priority: "super_urgent",
    };
    expect(createTaskSchema.safeParse(invalidPriority).success).toBe(false);
  });

  it("rejects self-dependencies explicitly", async () => {
    const taskId = "task_self_1";
    await expect(TasksDAL.addDependency("event_1", taskId, taskId)).rejects.toThrow(
      /cannot depend on itself/i
    );
  });

  it("propagates cascading delays to downstream dependent tasks", () => {
    const baseDate = new Date("2026-10-01T12:00:00Z");
    const dependentDate = new Date("2026-10-10T12:00:00Z");

    const tasks: TaskItem[] = [
      {
        id: "task_a",
        eventId: "evt_1",
        title: "Venue Contract",
        description: null,
        dueDate: baseDate.toISOString(),
        priority: "critical",
        status: "pending",
        assignee: null,
        category: "Venue",
        estimatedDurationHours: null,
      },
      {
        id: "task_b",
        eventId: "evt_1",
        title: "Floor Plan Design",
        description: null,
        dueDate: dependentDate.toISOString(),
        priority: "high",
        status: "pending",
        assignee: null,
        category: "Decor",
        estimatedDurationHours: null,
      },
    ];

    const dependencies: TaskDependency[] = [
      { taskId: "task_b", dependsOnTaskId: "task_a" },
    ];

    const impacts = TimelineService.propagateTaskDelay("task_a", 7, tasks, dependencies);
    expect(impacts.length).toBe(2);

    const taskAImpact = impacts.find((i) => i.taskId === "task_a");
    const taskBImpact = impacts.find((i) => i.taskId === "task_b");

    expect(taskAImpact).toBeDefined();
    expect(taskBImpact).toBeDefined();

    expect(new Date(taskAImpact!.proposedDueDate).toISOString()).toBe(
      new Date("2026-10-08T12:00:00.000Z").toISOString()
    );
    expect(new Date(taskBImpact!.proposedDueDate).toISOString()).toBe(
      new Date("2026-10-17T12:00:00.000Z").toISOString()
    );
  });
});
