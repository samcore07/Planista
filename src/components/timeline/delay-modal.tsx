"use client";

import * as React from "react";
import { Clock, AlertTriangle, ArrowRight, X, Check } from "lucide-react";
import { TaskRow, DependencyRow } from "@/lib/dal/tasks.dal";
import { TimelineService, DelayedTaskImpact } from "@/services/timeline.service";
import { applyScheduleShiftAction } from "@/app/events/[eventId]/timeline/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DelayModalProps {
  eventId: string;
  task: TaskRow;
  allTasks: TaskRow[];
  dependencies: DependencyRow[];
  trigger?: React.ReactNode;
}

export function DelayModal({
  eventId,
  task,
  allTasks,
  dependencies,
  trigger,
}: DelayModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [delayDays, setDelayDays] = React.useState(7);
  const [isApplying, setIsApplying] = React.useState(false);

  // Convert to domain items for propagation service
  const taskItems = React.useMemo(
    () =>
      allTasks.map((t) => ({
        id: t.id,
        eventId: t.event_id,
        title: t.title,
        description: t.description,
        dueDate: t.due_date,
        priority: t.priority as "low" | "medium" | "high" | "critical",
        status: t.status as "pending" | "in_progress" | "completed" | "blocked",
        assignee: t.assignee,
        category: t.category,
        estimatedDurationHours: t.estimated_duration_hours ? Number(t.estimated_duration_hours) : null,
      })),
    [allTasks]
  );

  const taskDeps = React.useMemo(
    () =>
      dependencies.map((d) => ({
        taskId: d.task_id,
        dependsOnTaskId: d.depends_on_task_id,
      })),
    [dependencies]
  );

  // Compute live cascading impacts
  const impacts: DelayedTaskImpact[] = React.useMemo(() => {
    if (!task.due_date || delayDays <= 0) return [];
    return TimelineService.propagateTaskDelay(task.id, delayDays, taskItems, taskDeps);
  }, [task.id, task.due_date, delayDays, taskItems, taskDeps]);

  const handleApply = async () => {
    setIsApplying(true);
    await applyScheduleShiftAction(eventId, task.id, delayDays);
    setIsApplying(false);
    setIsOpen(false);
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)}>{trigger}</span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          <Clock className="h-3 w-3" />
          Shift
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-serif text-base font-semibold text-foreground">
                  Adaptive Schedule Shift & Impact Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                When a task deadline slips, downstream dependent milestones must shift in tandem to prevent scheduling collisions.
              </p>

              <div className="p-3 rounded-lg bg-secondary/50 border border-border flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground block">{task.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    Current Due Date:{" "}
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString(undefined, { dateStyle: "medium" })
                      : "Unscheduled"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">Delay by:</span>
                  <select
                    value={delayDays}
                    onChange={(e) => setDelayDays(Number(e.target.value))}
                    className="h-8 rounded border border-input bg-background px-2 text-xs"
                  >
                    <option value={3}>+3 Days</option>
                    <option value={5}>+5 Days</option>
                    <option value={7}>+7 Days (1 Week)</option>
                    <option value={14}>+14 Days (2 Weeks)</option>
                    <option value={21}>+21 Days (3 Weeks)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cascading Impact Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Affected Downstream Tasks ({impacts.length})
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Requires Confirmation
                </Badge>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {impacts.map((imp) => (
                  <div
                    key={imp.taskId}
                    className="p-2.5 rounded-md border border-border/80 bg-secondary/30 space-y-1"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-foreground truncate max-w-[200px]">
                        {imp.taskTitle}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-muted-foreground line-through">
                          {imp.originalDueDate ? new Date(imp.originalDueDate).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }) : "—"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-primary font-semibold">
                          {new Date(imp.proposedDueDate).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{imp.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply} disabled={isApplying} className="gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5" />
                {isApplying ? "Applying Shift..." : "Confirm Revised Schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
