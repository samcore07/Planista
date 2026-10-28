import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Workflow,
  Flame,
  Clock,
  Activity,
} from "lucide-react";
import { EventsDAL } from "@/lib/dal/events.dal";
import { TasksDAL } from "@/lib/dal/tasks.dal";
import { BudgetDAL } from "@/lib/dal/budget.dal";
import { RiskDAL } from "@/lib/dal/risk.dal";
import { LogisticsService } from "@/services/logistics.service";
import { TaskItem, TaskDependency } from "@/services/timeline.service";
import { ReadinessScorecard } from "@/components/logistics/readiness-scorecard";
import { EventDependencyGraph } from "@/components/logistics/event-dependency-graph";
import { CriticalPathAnalyzer } from "@/components/logistics/critical-path-analyzer";
import { ResourceHeatmapComponent } from "@/components/logistics/resource-heatmap";
import { DisciplineCharts } from "@/components/logistics/discipline-charts";
import { Badge } from "@/components/ui/badge";

export const instant = false;

interface LogisticsPageProps {
  params: Promise<{ eventId: string }>;
}

async function LogisticsContent({ eventId }: { eventId: string }) {
  const event = await EventsDAL.getEventById(eventId);
  if (!event) notFound();

  const [tasks, dependencies, categories, expenses, risks] = await Promise.all([
    TasksDAL.getTasks(eventId),
    TasksDAL.getDependencies(eventId),
    BudgetDAL.getCategories(eventId),
    BudgetDAL.getExpenses(eventId),
    RiskDAL.getRisks(eventId),
  ]);

  // Convert raw database rows into domain TaskItem and TaskDependency
  const taskItems: TaskItem[] = tasks.map((t) => ({
    id: t.id,
    eventId: t.event_id,
    title: t.title,
    description: t.description,
    dueDate: t.due_date,
    priority: t.priority,
    status: t.status,
    assignee: t.assignee,
    category: t.category,
    estimatedDurationHours: t.estimated_duration_hours
      ? Number(t.estimated_duration_hours)
      : 2.0,
  }));

  const depItems: TaskDependency[] = dependencies.map((d) => ({
    taskId: d.task_id,
    dependsOnTaskId: d.depends_on_task_id,
  }));

  // Execute Exact Logistics Algorithms
  const criticalAnalysis = LogisticsService.analyzeCriticalPath(taskItems, depItems);
  const readinessReport = LogisticsService.evaluateReadiness(
    taskItems,
    criticalAnalysis,
    categories,
    expenses,
    risks
  );
  const heatmap = LogisticsService.generateResourceHeatmap(taskItems, event.event_date);
  const disciplineBreakdown = LogisticsService.getDisciplineBreakdown(taskItems);

  const criticalIds = new Set(criticalAnalysis.criticalPath.map((t) => t.id));
  const graphData = LogisticsService.layoutDependencyGraph(
    taskItems,
    depItems,
    criticalIds
  );

  const priorities: ("critical" | "high" | "medium" | "low")[] = [
    "critical",
    "high",
    "medium",
    "low",
  ];
  const priorityBreakdown = priorities.map((p) => {
    const matching = taskItems.filter((t) => t.priority === p);
    return {
      priority: p,
      total: matching.length,
      completed: matching.filter((t) => t.status === "completed").length,
      hours:
        Math.round(
          matching.reduce(
            (sum, t) => sum + (Number(t.estimatedDurationHours) || 2.0),
            0
          ) * 10
        ) / 10,
    };
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-1">
            <Link href={`/events/${eventId}`} className="hover:text-foreground transition-colors">
              {event.title}
            </Link>
            <span>/</span>
            <span className="text-primary font-medium">Logistics Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Workflow className="h-5 w-5" />
            </span>
            Logistics & Operational Engineering
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Live CPM dependency graph, real-time readiness scoring, critical slack float analyzer, and resource allocation heatmap.
          </p>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1.5 py-1 px-3 text-xs"
          >
            <Activity className="h-3.5 w-3.5" />
            Readiness: {readinessReport.overallScore}%
          </Badge>

          <Badge
            variant="outline"
            className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 gap-1.5 py-1 px-3 text-xs font-mono"
          >
            <Flame className="h-3.5 w-3.5" />
            Critical Sequence: {criticalAnalysis.totalProjectDurationHours} hrs
          </Badge>

          <Badge
            variant="outline"
            className="border-border bg-card text-foreground gap-1.5 py-1 px-3 text-xs font-mono"
          >
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {tasks.length} Total Milestones
          </Badge>
        </div>
      </div>

      {/* 1. Live Operational Readiness Scorecard */}
      <section aria-label="Operational Readiness">
        <ReadinessScorecard report={readinessReport} />
      </section>

      {/* 2. Interactive Event Dependency Flowchart & Graph */}
      <section aria-label="Dependency Flowchart">
        <EventDependencyGraph graphData={graphData} />
      </section>

      {/* 3. Critical Path Method (CPM) & Slack Float Analyzer */}
      <section aria-label="Critical Path Analyzer">
        <CriticalPathAnalyzer analysis={criticalAnalysis} />
      </section>

      {/* 4. Resource Utilization Heatmap */}
      <section aria-label="Resource Utilization">
        <ResourceHeatmapComponent heatmap={heatmap} />
      </section>

      {/* 5. Discipline Breakdown Donut & Priority Velocity Horizon Bars */}
      <section aria-label="Discipline Breakdown">
        <DisciplineCharts
          disciplineBreakdown={disciplineBreakdown}
          priorityBreakdown={priorityBreakdown}
        />
      </section>
    </div>
  );
}

export default async function LogisticsPage({ params }: LogisticsPageProps) {
  const { eventId } = await params;

  return (
    <Suspense
      fallback={
        <div className="p-12 text-center space-y-3 max-w-md mx-auto">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-muted-foreground font-mono">
            Compiling Operational Readiness & Dependency Topology...
          </p>
        </div>
      }
    >
      <LogisticsContent eventId={eventId} />
    </Suspense>
  );
}
