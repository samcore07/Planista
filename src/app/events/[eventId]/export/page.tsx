import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { EventsDAL } from "@/lib/dal/events.dal";
import { BudgetDAL } from "@/lib/dal/budget.dal";
import { TasksDAL } from "@/lib/dal/tasks.dal";
import { RiskDAL } from "@/lib/dal/risk.dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  Users,
  IndianRupee,
} from "lucide-react";

export const instant = false;

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ExportPage({ params }: PageProps) {
  const { eventId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect(`/auth/login?redirectTo=/events/${eventId}/export`);

  const event = await EventsDAL.getEventById(eventId);
  if (!event) redirect("/dashboard");

  const supabase = await createClient();

  const [categories, expenses, tasks, risks, vendorsResult] = await Promise.all([
    BudgetDAL.getCategories(eventId),
    BudgetDAL.getExpenses(eventId),
    TasksDAL.getTasks(eventId),
    RiskDAL.getRisks(eventId),
    supabase.from("vendors").select("*").eq("event_id", eventId),
  ]);

  const vendors = vendorsResult.data || [];

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.actual_amount || 0), 0);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const criticalRisks = risks.filter((r) => r.severity === "critical" && !r.is_resolved).length;

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Export Center...</div>}>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">One-Click Event Pack</h1>
            <p className="text-sm text-muted-foreground">
              Generate and download consolidated event packs, print-ready PDF briefs, and ledger CSVs.
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 gap-1.5 py-1 w-fit">
            <CheckCircle className="h-3.5 w-3.5" />
            Synchronized With Database
          </Badge>
        </div>

        {/* Unsaved Changes / Accuracy Notice */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Live Snapshot Warning</p>
            <p className="text-xs text-muted-foreground">
              Exports are generated directly from the latest saved database state. If you recently modified budget items
              or task schedules in other tabs, ensure your changes have been confirmed before downloading.
            </p>
          </div>
        </div>

        {/* Primary Download: Print / PDF Bundle */}
        <Card className="border-primary/50 shadow-sm bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Printer className="h-5 w-5 text-primary" />
                  Full Printable Event Pack (PDF / Print-Ready HTML)
                </CardTitle>
                <CardDescription>
                  Consolidated briefing document containing Executive Overview, Budget Ledger, Timeline & Run Sheet,
                  Vendor Directory, Risk Mitigation Matrix, and Emergency Protocols.
                </CardDescription>
              </div>
              <Badge className="bg-primary text-primary-foreground">All-in-One</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a
                href={`/api/events/${eventId}/export?format=html`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <Printer className="h-4 w-4" />
                  Open & Print Event Pack (PDF)
                </Button>
              </a>
              <p className="text-xs text-muted-foreground">
                Opens a formatted print preview with an automatic &quot;Print / Save as PDF&quot; action bar.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Downloads: Modular CSV Exports */}
        <div>
          <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            Modular Spreadsheet Data (CSV)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Budget CSV */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-500" />
                  Budget & Expenses
                </CardTitle>
                <CardDescription className="text-xs">
                  {categories.length} categories, {expenses.length} expense items recorded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href={`/api/events/${eventId}/export?format=budget_csv`} download>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Download className="h-3.5 w-3.5" />
                    Download Budget CSV
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Tasks CSV */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Timeline & Checklist
                </CardTitle>
                <CardDescription className="text-xs">
                  {tasks.length} tasks scheduled ({completedTasks} completed).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href={`/api/events/${eventId}/export?format=tasks_csv`} download>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Download className="h-3.5 w-3.5" />
                    Download Run Sheet CSV
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Vendors CSV */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  Vendor Directory
                </CardTitle>
                <CardDescription className="text-xs">
                  {vendors.length} vendors & contact contracts linked.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href={`/api/events/${eventId}/export?format=vendors_csv`} download>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Download className="h-3.5 w-3.5" />
                    Download Vendors CSV
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Event State Summary Included in Pack */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Event Pack Contents & Verification Summary
            </CardTitle>
            <CardDescription>
              Summary of all verified data blocks currently bundled into this event pack.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="text-xs text-muted-foreground">Guest Target</p>
                <p className="text-xl font-bold mt-1">{event.guest_count} guests</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="text-xs text-muted-foreground">Total Budget Spent</p>
                <p className="text-xl font-bold mt-1">
                  {event.currency} {totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="text-xs text-muted-foreground">Task Completion</p>
                <p className="text-xl font-bold mt-1">
                  {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <p className="text-xs text-muted-foreground">Critical Open Risks</p>
                <p className={`text-xl font-bold mt-1 ${criticalRisks > 0 ? "text-destructive" : "text-emerald-500"}`}>
                  {criticalRisks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}
