import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { type Database, TaskPriority, TaskStatus } from "@/types/database.types";
import { TimelineService, DelayedTaskImpact } from "@/services/timeline.service";
import { z } from "zod";

export const createTaskSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().min(1, "Task title is required").trim(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]).default("pending"),
  assignee: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  estimatedDurationHours: z.number().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskRow = Database["public"]["Tables"]["timeline_tasks"]["Row"];
export type DependencyRow = Database["public"]["Tables"]["task_dependencies"]["Row"];

export class TasksDAL {
  static async getTasks(eventId: string): Promise<TaskRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("timeline_tasks")
      .select("*")
      .eq("event_id", eventId)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
    return data || [];
  }

  static async getDependencies(eventId: string): Promise<DependencyRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("task_dependencies")
      .select("*, timeline_tasks!task_id(event_id)")
      .eq("timeline_tasks.event_id", eventId);

    if (error) throw new Error(`Failed to fetch dependencies: ${error.message}`);
    return data || [];
  }

  static async createTask(rawInput: CreateTaskInput): Promise<TaskRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = createTaskSchema.parse(rawInput);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("timeline_tasks")
      .insert({
        event_id: input.eventId,
        title: input.title,
        description: input.description ?? null,
        due_date: input.dueDate ?? null,
        priority: input.priority as TaskPriority,
        status: input.status as TaskStatus,
        assignee: input.assignee ?? null,
        category: input.category ?? null,
        estimated_duration_hours: input.estimatedDurationHours ?? null,
      })
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to create task: ${error?.message}`);
    return data;
  }

  static async updateTask(taskId: string, rawInput: UpdateTaskInput): Promise<TaskRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = updateTaskSchema.parse(rawInput);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("timeline_tasks")
      .update({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.dueDate !== undefined && { due_date: input.dueDate }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.assignee !== undefined && { assignee: input.assignee }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.estimatedDurationHours !== undefined && { estimated_duration_hours: input.estimatedDurationHours }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to update task: ${error?.message}`);
    return data;
  }

  static async deleteTask(taskId: string): Promise<boolean> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { error } = await supabase.from("timeline_tasks").delete().eq("id", taskId);
    if (error) throw new Error(`Failed to delete task: ${error.message}`);
    return true;
  }

  static async addDependency(
    eventId: string,
    taskId: string,
    dependsOnTaskId: string
  ): Promise<DependencyRow> {
    if (taskId === dependsOnTaskId) {
      throw new Error("Self-dependencies are invalid: A task cannot depend on itself.");
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const currentDeps = await this.getDependencies(eventId);
    const candidateDeps = [
      ...currentDeps.map((d) => ({
        taskId: d.task_id,
        dependsOnTaskId: d.depends_on_task_id,
      })),
      { taskId, dependsOnTaskId },
    ];

    if (TimelineService.detectCycle(candidateDeps)) {
      throw new Error("Circular dependency detected: Adding this prerequisite creates a cycle.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("task_dependencies")
      .insert({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to add dependency: ${error?.message || "Already exists"}`);
    }

    return data;
  }

  static async removeDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { error } = await supabase
      .from("task_dependencies")
      .delete()
      .eq("task_id", taskId)
      .eq("depends_on_task_id", dependsOnTaskId);

    if (error) throw new Error(`Failed to remove dependency: ${error.message}`);
    return true;
  }

  static async applyBatchScheduleShift(impacts: DelayedTaskImpact[]): Promise<void> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    for (const impact of impacts) {
      const { error } = await supabase
        .from("timeline_tasks")
        .update({
          due_date: impact.proposedDueDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", impact.taskId);

      if (error) {
        throw new Error(`Failed to shift task schedule: ${error.message}`);
      }
    }
  }
}
