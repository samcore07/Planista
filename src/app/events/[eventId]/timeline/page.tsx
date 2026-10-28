import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Calendar,
  Clock,
  GitFork,
  X,
  Users,
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
  const filter = (resolvedSearchParams.filter as string) || "all";

  // Process time calculations
  const totalProcessHours = tasks.reduce(
    (sum, t) => sum + (Number(t.estimated_duration_hours) || 0),
    0
  );
  const completedProcessHours = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + (Number(t.estimated_duration_hours) || 0), 0);
  const remainingProcessHours = Math.max(0, totalProcessHours - completedProcessHours);

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

  const filteredTasks = tasks.filter((t) => {
    if (filter === "active") return t.status !== "completed";
    if (filter === "completed") return t.status === "completed";
    if (filter === "blocked") return blockedIds.has(t.id);
    if (filter === "overdue") return overdueIds.has(t.id);
    return true;
  });

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
        <div role="alert" aria-live="assertive" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSaved && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Checklist task successfully updated and re-evaluated.</span>
        </div>
      )}

      {isDeleted && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Task removed from event checklist.</span>
        </div>
      )}

      {isShifted && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
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
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Event Checklist & Schedule
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track tasks, complete deliverables, and manage cascading dependencies
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 text-xs font-medium shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>{remainingProcessHours}h</strong> process time remaining
                {totalProcessHours > 0 && (
                  <span className="text-blue-700/70 dark:text-blue-300/70 ml-1">
                    ({totalProcessHours}h total)
                  </span>
                )}
              </span>
            </span>
            <TaskModal eventId={eventId} />
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground space-y-3">
              <p>No checklist tasks created for this event yet.</p>
              <TaskModal eventId={eventId} />
            </div>
          ) : (
            <div>
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 border-b border-border pb-3 mb-4 overflow-x-auto">
                {[
                  { key: "all", label: "All Tasks", count: tasks.length },
                  { key: "active", label: "Active", count: timelineMetrics.pendingTasks.length },
                  { key: "completed", label: "Completed", count: timelineMetrics.completedTasks.length },
                  { key: "blocked", label: "Blocked", count: timelineMetrics.blockedTasks.length },
                  { key: "overdue", label: "Overdue", count: timelineMetrics.overdueTasks.length },
                ].map((tab) => {
                  const isActive = filter === tab.key;
                  return (
                    <Link
                      key={tab.key}
                      href={`/events/${eventId}/timeline${tab.key === "all" ? "" : `?filter=${tab.key}`}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {filteredTasks.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground space-y-2">
                  <p>No checklist tasks match the selected filter &quot;{filter}&quot;.</p>
                  <Link
                    href={`/events/${eventId}/timeline`}
                    className="inline-block text-xs font-medium text-primary hover:underline"
                  >
                    View all tasks ({tasks.length})
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task: TaskRow) => {
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
                            {/* High-visibility Completion Checkbox */}
                            <form action={toggleStatus} className="pt-0.5 shrink-0">
                              <button
                                type="submit"
                                title={isCompleted ? "Mark as pending" : "Mark as completed"}
                                className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
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
                                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                                ) : (
                                  <div className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                                )}
                              </button>
                            </form>

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm font-semibold tracking-tight ${
                                    isCompleted
                                      ? "line-through text-muted-foreground font-normal"
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
                                  className="text-[9px] uppercase px-1.5 py-0 font-semibold"
                                >
                                  {task.priority}
                                </Badge>

                                {isOverdue && (
                                  <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0 font-semibold">
                                    Overdue
                                  </Badge>
                                )}

                                {isBlocked && (
                                  <Badge variant="warning" className="text-[9px] uppercase px-1.5 py-0 font-semibold">
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
                                {/* Process Time Badge */}
                                {task.estimated_duration_hours ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 text-[11px] font-semibold shadow-2xs">
                                    <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>
                                      Process Time: {Number(task.estimated_duration_hours)} hr{Number(task.estimated_duration_hours) === 1 ? "" : "s"}
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
                                    Due {new Date(task.due_date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                                  </span>
                                )}

                                {task.assignee && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    Assignee: <strong className="text-foreground font-medium">{task.assignee}</strong>
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
