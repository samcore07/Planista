import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  CheckCircle,
  Trash2,
  Calendar,
  Clock,
  GitFork,
  X,
} from "lucide-react";
import { EventsDAL } from "@/lib/dal/events.dal";
import { TasksDAL, TaskRow } from "@/lib/dal/tasks.dal";
import { TimelineService } from "@/services/timeline.service";
import { TaskModal } from "@/components/timeline/task-modal";
import { DelayModal } from "@/components/timeline/delay-modal";
import {
  toggleTaskStatusAction,
  deleteTaskAction,
  addDependencyAction,
  removeDependencyAction,
} from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const instant = false;

interface TimelinePageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function TimelinePageContent({ params, searchParams }: TimelinePageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;

  const event = await EventsDAL.getEventById(eventId);
  if (!event) notFound();

  const [tasks, dependencies] = await Promise.all([
    TasksDAL.getTasks(eventId),
    TasksDAL.getDependencies(eventId),
  ]);

  // Compute live timeline metrics
  const timelineMetrics = TimelineService.analyzeTimeline(
    tasks.map((t) => ({
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
    dependencies.map((d) => ({
      taskId: d.task_id,
      dependsOnTaskId: d.depends_on_task_id,
    }))
  );

  const errorMessage = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const isSaved = resolvedSearchParams.saved === "true";
  const isDeleted = resolvedSearchParams.deleted === "true";
  const isShifted = resolvedSearchParams.shifted === "true";

  // Map dependencies per task
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const depsByTask = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = depsByTask.get(dep.task_id) || [];
    list.push(dep.depends_on_task_id);
    depsByTask.set(dep.task_id, list);
  }

  const overdueIds = new Set(timelineMetrics.overdueTasks.map((t) => t.id));
  const blockedIds = new Set(timelineMetrics.blockedTasks.map((t) => t.id));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Adaptive Timeline & Smart Checklist
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Dynamic milestone progression, dependency validation, cycle protection, and cascading delay intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TaskModal eventId={eventId} />
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSaved && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Checklist task successfully updated and re-evaluated.</span>
        </div>
      )}

      {isDeleted && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Task removed from event checklist.</span>
        </div>
      )}

      {isShifted && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Adaptive schedule shift successfully cascaded across downstream milestones.</span>
        </div>
      )}

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Checklist Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-1">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {timelineMetrics.completionPercentage}%
            </div>
            <p className="text-[11px] text-muted-foreground">
              {timelineMetrics.completedTasks.length} of {tasks.length} tasks completed
            </p>
            <Progress value={timelineMetrics.completionPercentage} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {timelineMetrics.pendingTasks.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Active milestones in flight
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Overdue Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                timelineMetrics.overdueTasks.length > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {timelineMetrics.overdueTasks.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {timelineMetrics.overdueTasks.length > 0
                ? "Immediate rescheduling advised"
                : "Timeline on schedule"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Dependency Blocked
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                timelineMetrics.blockedTasks.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              }`}
            >
              {timelineMetrics.blockedTasks.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Awaiting prerequisite sign-offs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Checklist Card */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Event Checklist & Schedule
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Track tasks, complete deliverables, and manage cascading dependencies
            </p>
          </div>
          <TaskModal eventId={eventId} />
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground space-y-3">
              <p>No checklist tasks created for this event yet.</p>
              <TaskModal eventId={eventId} />
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: TaskRow) => {
                const isOverdue = overdueIds.has(task.id);
                const isBlocked = blockedIds.has(task.id);
                const isCompleted = task.status === "completed";
                const prereqIds = depsByTask.get(task.id) || [];
                const prereqTasks = prereqIds.map((id) => taskMap.get(id)).filter(Boolean) as TaskRow[];

                const toggleStatus = toggleTaskStatusAction.bind(
                  null,
                  eventId,
                  task.id,
                  isCompleted ? "pending" : "completed"
                );
                const deleteTask = deleteTaskAction.bind(null, eventId, task.id);
                const addDepWithId = addDependencyAction.bind(null, eventId, task.id);

                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border p-4 transition-all ${
                      isCompleted
                        ? "bg-secondary/20 border-border opacity-70"
                        : isOverdue
                        ? "bg-destructive/5 border-destructive/40"
                        : isBlocked
                        ? "bg-amber-500/5 border-amber-500/40"
                        : "bg-card border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Completion Checkbox */}
                        <form action={toggleStatus} className="pt-0.5">
                          <button
                            type="submit"
                            className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                              isCompleted
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border hover:border-primary bg-background"
                            }`}
                          >
                            {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                          </button>
                        </form>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-medium ${
                                isCompleted
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {task.title}
                            </span>

                            <Badge
                              variant={
                                task.priority === "critical"
                                  ? "destructive"
                                  : task.priority === "high"
                                  ? "warning"
                                  : "outline"
                              }
                              className="text-[9px] uppercase px-1.5 py-0"
                            >
                              {task.priority}
                            </Badge>

                            {isOverdue && (
                              <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0">
                                Overdue
                              </Badge>
                            )}

                            {isBlocked && (
                              <Badge variant="warning" className="text-[9px] uppercase px-1.5 py-0">
                                Blocked
                              </Badge>
                            )}

                            {task.category && (
                              <span className="text-[11px] text-muted-foreground">
                                • {task.category}
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground">
                              {task.description}
                            </p>
                          )}

                          {/* Meta: Due Date & Assignee */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Calendar className="h-3 w-3" />
                                Due {new Date(task.due_date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </span>
                            )}

                            {task.assignee && (
                              <span className="text-[11px]">
                                Assignee: <strong className="text-foreground">{task.assignee}</strong>
                              </span>
                            )}

                            {task.estimated_duration_hours && (
                              <span className="text-[11px]">
                                Est: {Number(task.estimated_duration_hours)}h
                              </span>
                            )}
                          </div>

                          {/* Prerequisites & Dependencies list */}
                          {prereqTasks.length > 0 && (
                            <div className="pt-2.5 flex items-center gap-2 text-xs flex-wrap">
                              <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
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
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border shadow-xs transition-colors ${
                                      isPrereqDone
                                        ? "bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100"
                                        : "bg-amber-100/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100"
                                    }`}
                                  >
                                    {isPrereqDone ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                    ) : (
                                      <Clock className="h-3 w-3 text-amber-700 dark:text-amber-400 shrink-0" />
                                    )}
                                    <span>{prereq.title}</span>
                                    <form action={removeDep} className="inline-flex items-center">
                                      <button
                                        type="submit"
                                        className={`rounded p-0.5 transition-colors ${
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
                          allTasks={tasks}
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
                              type="button"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Edit
                            </Button>
                          }
                        />

                        {/* Delete Action */}
                        <form action={deleteTask} className="inline-block">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="submit"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>
                    </div>

                    {/* Add Dependency quick selector */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <GitFork className="h-3 w-3 text-muted-foreground" />
                        Add prerequisite milestone:
                      </span>
                      <form action={addDepWithId} className="flex items-center gap-1.5">
                        <select
                          name="dependsOnTaskId"
                          required
                          className="h-7 rounded-md border border-input bg-background px-2 text-[11px] text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Select prerequisite...</option>
                          {tasks
                            .filter((other) => other.id !== task.id && !prereqIds.includes(other.id))
                            .map((other) => (
                              <option key={other.id} value={other.id}>
                                {other.title}
                              </option>
                            ))}
                        </select>
                        <Button variant="outline" size="sm" type="submit" className="h-7 px-2.5 text-[11px] font-medium">
                          Link
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TimelinePage(props: TimelinePageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-secondary rounded" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
          </div>
        </div>
      }
    >
      <TimelinePageContent {...props} />
    </Suspense>
  );
}
