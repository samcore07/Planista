"use client";

import { useOptimistic, startTransition } from "react";
import {
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  GitFork,
  X,
  Trash2,
  Edit2,
} from "lucide-react";
import { TaskRow, DependencyRow } from "@/lib/dal/tasks.dal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/timeline/task-modal";
import { DelayModal } from "@/components/timeline/delay-modal";
import {
  toggleTaskStatusAction,
  deleteTaskAction,
  removeDependencyAction,
  addDependencyAction,
} from "@/app/events/[eventId]/timeline/actions";

interface TaskCardProps {
  eventId: string;
  task: TaskRow;
  isOverdue: boolean;
  isBlocked: boolean;
  prereqTasks: TaskRow[];
  allTasks: TaskRow[];
  dependencies: DependencyRow[];
}

export function TaskCard({
  eventId,
  task,
  isOverdue,
  isBlocked,
  prereqTasks,
  allTasks,
  dependencies,
}: TaskCardProps) {
  const [isCompleted, setOptimisticCompleted] = useOptimistic(
    task.status === "completed",
    (_, newStatus: boolean) => newStatus
  );

  const handleToggle = () => {
    const nextCompleted = !isCompleted;
    const nextStatus = nextCompleted ? "completed" : "pending";

    // Instant zero-latency optimistic switch (React 19)
    startTransition(async () => {
      setOptimisticCompleted(nextCompleted);
      await toggleTaskStatusAction(eventId, task.id, nextStatus);
    });
  };

  const deleteTask = deleteTaskAction.bind(null, eventId, task.id);

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-150 ${
        isCompleted
          ? "bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20 opacity-80"
          : isOverdue
          ? "bg-destructive/5 border-destructive/40 shadow-2xs"
          : isBlocked
          ? "bg-amber-500/5 border-amber-500/40 shadow-2xs"
          : "bg-card border-border hover:border-primary/40 hover:shadow-2xs"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Instantaneous Completion Checkbox */}
          <button
            type="button"
            onClick={handleToggle}
            aria-label={
              isCompleted
                ? `Mark "${task.title}" as pending`
                : `Mark "${task.title}" as completed`
            }
            title={isCompleted ? "Mark as pending" : "Mark as completed"}
            className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 shrink-0 ${
              isCompleted
                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
                : isBlocked
                ? "border-amber-400 bg-amber-500/10 text-amber-600 hover:border-amber-500"
                : isOverdue
                ? "border-destructive bg-destructive/10 text-destructive hover:border-destructive/80"
                : "border-muted-foreground/40 hover:border-primary hover:bg-primary/5 bg-background text-transparent hover:text-muted-foreground"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 stroke-[2.5] animate-in zoom-in-75 duration-150" />
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
            )}
          </button>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleToggle}
                className={`text-left text-sm font-semibold tracking-tight cursor-pointer select-none transition-all duration-150 p-0 bg-transparent border-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs ${
                  isCompleted
                    ? "line-through text-muted-foreground font-normal"
                    : "text-foreground hover:text-primary"
                }`}
              >
                {task.title}
              </button>

              <Badge
                variant={
                  task.priority === "critical"
                    ? "destructive"
                    : task.priority === "high"
                    ? "warning"
                    : "outline"
                }
                className="text-[9px] uppercase px-1.5 py-0 font-semibold"
              >
                {task.priority}
              </Badge>

              {isOverdue && !isCompleted && (
                <Badge
                  variant="destructive"
                  className="text-[9px] uppercase px-1.5 py-0 font-semibold"
                >
                  Overdue
                </Badge>
              )}

              {isBlocked && !isCompleted && (
                <Badge
                  variant="warning"
                  className="text-[9px] uppercase px-1.5 py-0 font-semibold"
                >
                  Blocked
                </Badge>
              )}

              {task.category && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  • {task.category}
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Prominent Process Time & Metadata Row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
              {task.estimated_duration_hours ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 text-[11px] font-semibold shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>
                    Process Time: {Number(task.estimated_duration_hours)} hr
                    {Number(task.estimated_duration_hours) === 1 ? "" : "s"}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3 opacity-40" />
                  <span>Process Time: —</span>
                </span>
              )}

              {task.due_date && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/80">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  Due{" "}
                  {new Date(task.due_date).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
              )}

              {task.assignee && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  Assignee:{" "}
                  <strong className="text-foreground font-medium">
                    {task.assignee}
                  </strong>
                </span>
              )}
            </div>

            {/* Prerequisites & Dependencies list */}
            {prereqTasks.length > 0 && (
              <div className="pt-2 flex items-center gap-2 text-xs flex-wrap">
                <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
                  <GitFork className="h-3 w-3 text-muted-foreground" />
                  Prerequisites:
                </span>
                {prereqTasks.map((prereq) => {
                  const removeDep = removeDependencyAction.bind(
                    null,
                    eventId,
                    task.id,
                    prereq.id
                  );
                  const isPrereqDone = prereq.status === "completed";
                  return (
                    <span
                      key={prereq.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border shadow-2xs transition-colors ${
                        isPrereqDone
                          ? "bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100"
                          : "bg-amber-100/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100"
                      }`}
                    >
                      {isPrereqDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                      )}
                      <span>{prereq.title}</span>
                      <form
                        action={removeDep}
                        className="inline-flex items-center"
                      >
                        <button
                          type="submit"
                          className={`rounded p-0.5 transition-colors cursor-pointer ${
                            isPrereqDone
                              ? "text-emerald-800/70 hover:text-destructive hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60"
                              : "text-amber-800/70 hover:text-destructive hover:bg-amber-200/60 dark:hover:bg-amber-900/60"
                          }`}
                          title={`Remove prerequisite link to "${prereq.title}"`}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove</span>
                        </button>
                      </form>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Delay Schedule Shift Preview */}
          <DelayModal
            eventId={eventId}
            task={task}
            allTasks={allTasks}
            dependencies={dependencies}
          />

          {/* Edit Modal */}
          <TaskModal
            eventId={eventId}
            task={task}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Edit task ${task.title}`}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            }
          />

          {/* Delete Action Form */}
          <form action={deleteTask}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              aria-label={`Delete task ${task.title}`}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Add Dependency quick selector */}
      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
        <span className="flex items-center gap-1 font-medium">
          <GitFork className="h-3 w-3 text-muted-foreground" />
          Add prerequisite milestone:
        </span>
        <form action={addDependencyAction.bind(null, eventId, task.id)} className="flex items-center gap-1.5">
          <select
            name="dependsOnTaskId"
            required
            aria-label={`Select prerequisite milestone for ${task.title}`}
            className="h-7 rounded-md border border-input bg-background px-2 text-[11px] text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select prerequisite...</option>
            {allTasks
              .filter(
                (other) =>
                  other.id !== task.id &&
                  !prereqTasks.some((p) => p.id === other.id)
              )
              .map((other) => (
                <option key={other.id} value={other.id}>
                  {other.title}
                </option>
              ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            type="submit"
            className="h-7 px-2.5 text-[11px] font-medium"
          >
            Link
          </Button>
        </form>
      </div>
    </div>
  );
}
