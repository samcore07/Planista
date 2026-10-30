/**
 * @fileoverview Server Actions for Critical Path Timeline & Task Checklist.
 * Supports task lifecycle mutations, optimistic status flips, DAG dependency linking,
 * and automated CPM schedule shift propagation.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TasksDAL, createTaskSchema, updateTaskSchema } from "@/lib/dal/tasks.dal";
import { TimelineService, TaskItem } from "@/services/timeline.service";
import { EventOrchestratorService } from "@/services/orchestrator.service";
import {
  getFormString,
  getOptionalFormString,
  getOptionalFormNumber,
} from "@/lib/form-utils";

function parsePriority(val: string | null): "low" | "medium" | "high" | "critical" {
  if (val === "low" || val === "high" || val === "critical") return val;
  return "medium";
}

function parseStatus(val: string | null): "pending" | "in_progress" | "completed" | "blocked" {
  if (val === "in_progress" || val === "completed" || val === "blocked") return val;
  return "pending";
}

/**
 * Creates a new milestone task under the specified event timeline.
 *
 * @param eventId - Target event UUID.
 * @param formData - Form fields containing task parameters.
 */
export async function createTaskAction(eventId: string, formData: FormData): Promise<void> {
  const title = getFormString(formData, "title");
  const description = getOptionalFormString(formData, "description");
  const dueDate = getOptionalFormString(formData, "dueDate");
  const priority = parsePriority(getOptionalFormString(formData, "priority"));
  const status = parseStatus(getOptionalFormString(formData, "status"));
  const assignee = getOptionalFormString(formData, "assignee");
  const category = getOptionalFormString(formData, "category");
  const estimatedDurationHours = getOptionalFormNumber(formData, "estimatedDurationHours");

  const parsed = createTaskSchema.safeParse({
    eventId,
    title,
    description,
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    priority,
    status,
    assignee,
    category,
    estimatedDurationHours,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid task parameters";
    redirect(`/events/${eventId}/timeline?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    await TasksDAL.createTask(parsed.data);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create task";
    redirect(`/events/${eventId}/timeline?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/timeline`);
  redirect(`/events/${eventId}/timeline?saved=true`);
}

export async function updateTaskAction(
  eventId: string,
  taskId: string,
  formData: FormData
): Promise<void> {
  const title = getOptionalFormString(formData, "title") ?? undefined;
  const description = getOptionalFormString(formData, "description");
  const dueDate = getOptionalFormString(formData, "dueDate");
  const rawPriority = getOptionalFormString(formData, "priority");
  const priority = rawPriority ? parsePriority(rawPriority) : undefined;
  const rawStatus = getOptionalFormString(formData, "status");
  const status = rawStatus ? parseStatus(rawStatus) : undefined;
  const assignee = getOptionalFormString(formData, "assignee");
  const category = getOptionalFormString(formData, "category");
  const estimatedDurationHours = getOptionalFormNumber(formData, "estimatedDurationHours");

  const parsed = updateTaskSchema.safeParse({
    title,
    description,
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    priority,
    status,
    assignee,
    category,
    estimatedDurationHours,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid task parameters";
    redirect(`/events/${eventId}/timeline?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    await TasksDAL.updateTask(taskId, parsed.data);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update task";
    redirect(`/events/${eventId}/timeline?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/timeline`);
  redirect(`/events/${eventId}/timeline?saved=true`);
}

export async function toggleTaskStatusAction(
  eventId: string,
  taskId: string,
  newStatus: "pending" | "in_progress" | "completed" | "blocked"
): Promise<{ success: boolean; error?: string }> {
  try {
    await TasksDAL.updateTask(taskId, { status: newStatus });
    await EventOrchestratorService.recalculateEventState(eventId);
    revalidatePath(`/events/${eventId}/timeline`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update task status";
    return { success: false, error: message };
  }
}

export async function deleteTaskAction(eventId: string, taskId: string): Promise<void> {
  try {
    await TasksDAL.deleteTask(taskId);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete task";
    redirect(`/events/${eventId}/timeline?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/timeline`);
  redirect(`/events/${eventId}/timeline?deleted=true`);
}

export async function addDependencyAction(
  eventId: string,
  taskId: string,
  formData: FormData
): Promise<void> {
  const dependsOnTaskId = getFormString(formData, "dependsOnTaskId");

  try {
    await TasksDAL.addDependency(eventId, taskId, dependsOnTaskId);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add dependency";
    redirect(`/events/${eventId}/timeline?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/timeline`);
  redirect(`/events/${eventId}/timeline`);
}

export async function removeDependencyAction(
  eventId: string,
  taskId: string,
  dependsOnTaskId: string
): Promise<void> {
  try {
    await TasksDAL.removeDependency(taskId, dependsOnTaskId);
    await EventOrchestratorService.recalculateEventState(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove dependency";
    redirect(`/events/${eventId}/timeline?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/timeline`);
  redirect(`/events/${eventId}/timeline?deleted=true`);
}

export async function applyScheduleShiftAction(
  eventId: string,
  delayedTaskId: string,
  delayDays: number
): Promise<void> {
  try {
    const [tasks, dependencies] = await Promise.all([
      TasksDAL.getTasks(eventId),
      TasksDAL.getDependencies(eventId),
    ]);

    const taskItems: TaskItem[] = tasks.map((t) => ({
      id: t.id,
      eventId: t.event_id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      priority: parsePriority(t.priority),
      status: parseStatus(t.status),
      assignee: t.assignee,
      category: t.category,
      estimatedDurationHours: t.estimated_duration_hours ? Number(t.estimated_duration_hours) : null,
    }));

    const taskDeps = dependencies.map((d) => ({
      taskId: d.task_id,
      dependsOnTaskId: d.depends_on_task_id,
    }));

    const impacts = TimelineService.propagateTaskDelay(delayedTaskId, delayDays, taskItems, taskDeps);

    if (impacts.length > 0) {
      await TasksDAL.applyBatchScheduleShift(impacts);
      await EventOrchestratorService.recalculateEventState(eventId);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to shift schedule";
    redirect(`/events/${eventId}/timeline?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/events/${eventId}/timeline`);
  redirect(`/events/${eventId}/timeline?shifted=true`);
}
