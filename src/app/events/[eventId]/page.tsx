import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Palette,
  FileSearch,
  Download,
  Workflow,
  Settings,
  Clock,
} from "lucide-react";
import { EventsDAL } from "@/lib/dal/events.dal";
import { BudgetDAL } from "@/lib/dal/budget.dal";
import { TasksDAL } from "@/lib/dal/tasks.dal";
import { BudgetService } from "@/services/budget.service";
import { TimelineService } from "@/services/timeline.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const instant = false;

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

async function EventOverviewContent({ params }: EventPageProps) {
  const { eventId } = await params;

  const event = await EventsDAL.getEventById(eventId);
  if (!event) notFound();

  // Load real child data in parallel
  const [categories, expenses, tasks, dependencies] = await Promise.all([
    BudgetDAL.getCategories(eventId),
    BudgetDAL.getExpenses(eventId),
    TasksDAL.getTasks(eventId),
    TasksDAL.getDependencies(eventId),
  ]);

  // Compute live budget metrics
  const budgetMetrics = BudgetService.calculate(
    Number(event.total_budget || 0),
    event.guest_count || 0,
    categories.map((c) => ({
      id: c.id,
      eventId: c.event_id,
      name: c.name,
      allocatedAmount: Number(c.allocated_amount || 0),
    })),
    expenses.map((e) => ({
      id: e.id,
      eventId: e.event_id,
      categoryId: e.category_id,
      title: e.title,
      estimatedAmount: Number(e.estimated_amount || 0),
      actualAmount: Number(e.actual_amount || 0),
      depositPaid: Number(e.deposit_paid || 0),
      dueDate: e.due_date,
      paymentStatus: e.payment_status as "unpaid" | "deposit_paid" | "fully_paid",
    }))
  );

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

  const budgetProgress =
    budgetMetrics.totalBudget > 0
      ? Math.min(100, Math.round((budgetMetrics.totalActual / budgetMetrics.totalBudget) * 100))
      : 0;

  return (
    <div className="space-y-8">
      {/* Event Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={event.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">
              {event.status === "cancelled" ? "Archived" : event.status}
            </Badge>
            <span className="text-xs text-muted-foreground capitalize">{event.event_type}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {event.title}
          </h1>
          {event.description && (
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              {event.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Link href={`/events/${eventId}/settings`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full sm:w-auto">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Button>
          </Link>
          <Link href={`/events/${eventId}/export`}>
            <Button size="sm" className="gap-1.5 text-xs w-full sm:w-auto">
              <Download className="h-3.5 w-3.5" />
              Export Pack
            </Button>
          </Link>
        </div>
      </div>

      {/* Meta Specs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-card border border-border text-xs">
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Event Date
          </span>
          <p className="font-medium text-foreground">
            {event.event_date
              ? new Date(event.event_date).toLocaleDateString(undefined, { dateStyle: "long" })
              : "Not scheduled yet"}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Location
          </span>
          <p className="font-medium text-foreground truncate">
            {event.location || "TBD / Flexible"}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            Expected Guests
          </span>
          <p className="font-medium text-foreground">
            {event.guest_count} attendees
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 text-primary" />
            Cost Per Guest
          </span>
          <p className="font-medium text-foreground">
            ₹{budgetMetrics.costPerGuest.toFixed(2)} {event.currency === "INR" ? "" : event.currency}
          </p>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Budget Card */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Budget Status
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                ₹{budgetMetrics.totalActual.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                of ₹{budgetMetrics.totalBudget.toLocaleString("en-IN", { minimumFractionDigits: 2 })} {event.currency} cap
              </p>
            </div>
            <Progress value={budgetProgress} className="h-1.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{budgetProgress}% committed</span>
              <span className={budgetMetrics.isOverBudget ? "text-destructive font-medium" : "text-emerald-700 font-medium"}>
                {budgetMetrics.isOverBudget
                  ? `+₹${budgetMetrics.overspendAmount.toFixed(2)} Over`
                  : `₹${budgetMetrics.remainingUnspent.toFixed(2)} remaining`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Progress */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Task Checklist
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {timelineMetrics.completionPercentage}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {timelineMetrics.completedTasks.length} of {tasks.length} tasks completed
              </p>
            </div>
            <Progress value={timelineMetrics.completionPercentage} className="h-1.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{timelineMetrics.pendingTasks.length + timelineMetrics.inProgressTasks.length} pending / in progress</span>
              {timelineMetrics.overdueTasks.length > 0 && (
                <span className="text-destructive font-medium">
                  {timelineMetrics.overdueTasks.length} overdue
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risk Radar Snapshot */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Operational Health
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {timelineMetrics.blockedTasks.length > 0 || budgetMetrics.isOverBudget ? "Attention Needed" : "Optimal"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {timelineMetrics.blockedTasks.length} blocked tasks • {budgetMetrics.categories.filter(c => c.isOverBudget).length} category warnings
              </p>
            </div>
            <div className="pt-2">
              <Link href={`/events/${eventId}/risks`} className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                Open Risk Radar
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspace Feature Hub */}
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Workspace Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/events/${eventId}/budget`}
            className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-primary">
                <IndianRupee className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              Live Budget Intelligence
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Category breakdowns, expense tracking, deposit deadlines, and AI-grounded saving proposals.
            </p>
          </Link>

          <Link
            href={`/events/${eventId}/timeline`}
            className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              Adaptive Timeline & Checklist
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Dependency tracking, cycle prevention, slipping task impact forecasts, and priority queues.
            </p>
          </Link>

          <Link
            href={`/events/${eventId}/risks`}
            className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-primary">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              Event Risk Radar
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Deterministic rule-based risk detections, supporting evidence, and actionable mitigations.
            </p>
          </Link>

          <Link
            href={`/events/${eventId}/theme`}
            className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-primary">
                <Palette className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              AI Theme Studio
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Color palettes, floral & lighting directions, moodboards, and interactive refinement.
            </p>
          </Link>

          <Link
            href={`/events/${eventId}/scanner`}
            className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-primary">
                <FileSearch className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              Quote & Receipt Scanner
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Upload vendor quotes and receipts, verify extracted fields, and sync to budget.
            </p>
          </Link>

          <Link
            href={`/events/${eventId}/export`}
            className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-primary">
                <Download className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              One-Click Event Pack
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Generate cohesive event briefs, run sheets, printable schedules, and budget CSVs.
            </p>
          </Link>

          <Link
            href={`/events/${eventId}/logistics`}
            className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-primary">
                <Workflow className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              Logistics & Critical Path
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Interactive CPM dependency graph, live readiness score, critical slack float, and resource heatmaps.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function EventOverviewPage(props: EventPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-secondary rounded" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
            <div className="h-20 bg-card rounded border border-border" />
          </div>
        </div>
      }
    >
      <EventOverviewContent {...props} />
    </Suspense>
  );
}
