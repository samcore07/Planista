import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { EventsDAL } from "@/lib/dal/events.dal";
import { TasksDAL, TaskRow } from "@/lib/dal/tasks.dal";
import { TimelineService } from "@/services/timeline.service";
import { TaskModal } from "@/components/timeline/task-modal";
import { TaskCard } from "@/components/timeline/task-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
                    const prereqIds = depsByTask.get(task.id) || [];
                    const prereqTasks = prereqIds.map((id) => taskMap.get(id)).filter(Boolean) as TaskRow[];

                    return (
                      <TaskCard
                        key={task.id}
                        eventId={eventId}
                        task={task}
                        isOverdue={isOverdue}
                        isBlocked={isBlocked}
                        prereqTasks={prereqTasks}
                        allTasks={tasks}
                        dependencies={dependencies}
                      />
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
