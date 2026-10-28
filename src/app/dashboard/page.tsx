import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  Calendar,
  DollarSign,
  Plus,
  LogOut,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { EventsDAL } from "@/lib/dal/events.dal";

async function DashboardContent() {
  await connection();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/dashboard");
  }

  const userEmail = user.email || "planner@planista.app";
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    userEmail.split("@")[0];

  const metrics = await EventsDAL.getUserDashboardMetrics();

  const taskCompletionRate =
    metrics.totalTasks > 0
      ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
      : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-base shadow-sm">
                P
              </div>
              <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
                Planista
              </span>
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">
              Overview
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{userName}</span>
            </div>
            <form action={signOut}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Planning Overview
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Active celebrations, real-time budget intelligence, and task radars
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/events/architect">
              <Button variant="outline" size="sm" className="gap-2 shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Architect
              </Button>
            </Link>
            <Link href="/events/new">
              <Button size="sm" className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Security & RLS Verified Status Banner */}
        <div className="rounded-lg border border-border bg-secondary/40 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>Row Level Security (RLS) Active: Authenticated as {userEmail}</span>
          </div>
          <Badge variant="success">Tenant Isolated</Badge>
        </div>

        {/* Live Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Active Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.totalActiveEvents} Active
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {metrics.events.length - metrics.totalActiveEvents} archived / concluded
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Allocated Capital
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                ${metrics.totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                ${metrics.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })} committed expenses
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Task Progress
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {taskCompletionRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {metrics.completedTasks} of {metrics.totalTasks} tasks completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid: Events List & Next Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Events List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-foreground">
                Your Celebrations
              </h2>
              <span className="text-xs text-muted-foreground">
                {metrics.events.length} total
              </span>
            </div>

            {metrics.events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="max-w-sm mx-auto space-y-1">
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    No events planned yet
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Describe your vision in natural language with AI Event Architect or configure dates and budgets manually.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <Link href="/events/architect">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Use AI Architect
                    </Button>
                  </Link>
                  <Link href="/events/new">
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Manual Setup
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.events.map((evt) => {
                  const percentSpent =
                    evt.total_budget > 0
                      ? Math.min(100, Math.round((evt.spentAmount / evt.total_budget) * 100))
                      : 0;
                  const taskPercent =
                    evt.tasksTotal > 0
                      ? Math.round((evt.tasksCompleted / evt.tasksTotal) * 100)
                      : 0;

                  return (
                    <Link
                      key={evt.id}
                      href={`/events/${evt.id}`}
                      className="group block rounded-lg border border-border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge
                            variant={evt.status === "cancelled" ? "destructive" : "secondary"}
                            className="text-[10px] capitalize font-medium mb-1.5"
                          >
                            {evt.status === "cancelled" ? "Archived" : evt.status}
                          </Badge>
                          <h3 className="font-serif font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                            {evt.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">{evt.event_type}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                        {evt.event_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{new Date(evt.event_date).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                          </div>
                        )}
                        {evt.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span>{evt.guest_count} guests</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-medium text-foreground">
                              ${evt.spentAmount.toFixed(0)} / ${Number(evt.total_budget).toFixed(0)} {evt.currency}
                            </span>
                          </div>
                          <Progress value={percentSpent} className="h-1.5" />
                        </div>

                        {evt.tasksTotal > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">Tasks</span>
                              <span className="font-medium text-foreground">
                                {evt.tasksCompleted}/{evt.tasksTotal} ({taskPercent}%)
                              </span>
                            </div>
                            <Progress value={taskPercent} className="h-1.5 bg-secondary" />
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Actions & Tasks Radar */}
          <div className="space-y-4">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Immediate Priorities
            </h2>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Upcoming Tasks Across Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.upcomingTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No pending deadlines. Your timeline is clear!
                  </p>
                ) : (
                  metrics.upcomingTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-md bg-secondary/50 border border-border/50 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground line-clamp-1">
                          {t.title}
                        </span>
                        <Badge
                          variant={t.priority === "critical" || t.priority === "high" ? "destructive" : "outline"}
                          className="text-[9px] uppercase px-1.5 py-0"
                        >
                          {t.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[140px]">{t.eventTitle}</span>
                        {t.dueDate && (
                          <span>Due {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="space-y-2 text-center">
            <div className="h-8 w-8 rounded-md bg-primary mx-auto animate-pulse" />
            <p className="text-xs text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
