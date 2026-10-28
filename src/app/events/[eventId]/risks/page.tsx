import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileText,
  Lightbulb,
} from "lucide-react";
import { EventsDAL } from "@/lib/dal/events.dal";
import { RiskDAL, RiskRow } from "@/lib/dal/risk.dal";
import { toggleRiskResolvedAction, recalculateRisksAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const instant = false;

interface RiskRadarPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function RiskRadarContent({ params, searchParams }: RiskRadarPageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;

  const event = await EventsDAL.getEventById(eventId);
  if (!event) notFound();

  const risks = await RiskDAL.getRisks(eventId);

  const activeRisks = risks.filter((r) => !r.is_resolved);
  const resolvedRisks = risks.filter((r) => r.is_resolved);
  const criticalCount = activeRisks.filter((r) => r.severity === "critical").length;
  const highCount = activeRisks.filter((r) => r.severity === "high").length;

  const errorMessage = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const isSaved = resolvedSearchParams.saved === "true";
  const isRefreshed = resolvedSearchParams.refreshed === "true";

  const refreshWithId = recalculateRisksAction.bind(null, eventId);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Event Risk Radar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Deterministic rule-based risk detections, grounded evidence, and actionable mitigations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form action={refreshWithId}>
            <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Re-evaluate Radar
            </Button>
          </form>
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
        <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Risk status updated.</span>
        </div>
      )}

      {isRefreshed && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Risk Radar synchronized against live budget, tasks, and vendor registry.</span>
        </div>
      )}

      {/* Health Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Findings
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {activeRisks.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {resolvedRisks.length} resolved risks
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Critical Severity
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                criticalCount > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {criticalCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {criticalCount > 0 ? "Requires urgent attention" : "No critical blockers"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              High Priority Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                highCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              }`}
            >
              {highCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Budget & milestone deadlines
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Operational Health
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {criticalCount === 0 && highCount === 0 ? "Guarded" : "At Risk"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Deterministic verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Risks Ledger */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Identified Operational Risks & Mitigations ({activeRisks.length})
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Live Real-Time Radar
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {activeRisks.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground space-y-3">
              <ShieldCheck className="h-10 w-10 text-emerald-700 dark:text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-medium text-foreground text-sm">No Unresolved Risks Detected</h4>
                <p>
                  All budget lines are within cap, checklist deadlines are on track, and dependencies are consistent.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeRisks.map((risk: RiskRow) => {
                const toggleResolved = toggleRiskResolvedAction.bind(
                  null,
                  eventId,
                  risk.id,
                  !risk.is_resolved
                );

                const supportingFacts = Array.isArray(risk.supporting_facts)
                  ? (risk.supporting_facts as string[])
                  : [];

                return (
                  <div
                    key={risk.id}
                    className="p-5 rounded-lg border border-border bg-card space-y-3.5 shadow-sm hover:border-primary/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={
                              risk.severity === "critical"
                                ? "destructive"
                                : risk.severity === "high"
                                ? "warning"
                                : "outline"
                            }
                            className="text-[10px] uppercase font-bold tracking-wider"
                          >
                            {risk.severity}
                          </Badge>

                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {risk.category}
                          </Badge>

                          <Badge variant="outline" className="text-[9px] text-muted-foreground">
                            Deterministic Rule
                          </Badge>
                        </div>

                        <h3 className="font-serif text-base font-semibold text-foreground pt-1">
                          {risk.title}
                        </h3>
                      </div>

                      <form action={toggleResolved}>
                        <Button
                          variant="outline"
                          size="sm"
                          type="submit"
                          className="gap-1.5 text-xs text-muted-foreground hover:text-emerald-700 hover:border-emerald-500/50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Resolved
                        </Button>
                      </form>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {risk.explanation}
                    </p>

                    {/* Supporting Facts */}
                    {supportingFacts.length > 0 && (
                      <div className="rounded-md bg-secondary/50 border border-border/70 p-3 space-y-1.5 text-xs">
                        <span className="font-medium text-foreground flex items-center gap-1.5 text-[11px]">
                          <FileText className="h-3 w-3 text-primary" />
                          Supporting Evidence & Event Data:
                        </span>
                        <ul className="text-muted-foreground list-disc list-inside space-y-0.5 text-[11px]">
                          {supportingFacts.map((fact, i) => (
                            <li key={i}>{fact}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Mitigation */}
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-1 text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1.5 text-[11px]">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" />
                        Recommended Mitigation Action:
                      </span>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {risk.mitigation_action}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Risks Section */}
      {resolvedRisks.length > 0 && (
        <Card className="border-border opacity-70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Resolved Findings ({resolvedRisks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {resolvedRisks.map((risk: RiskRow) => {
              const reopenRisk = toggleRiskResolvedAction.bind(null, eventId, risk.id, false);
              return (
                <div
                  key={risk.id}
                  className="p-3 rounded-md bg-secondary/30 border border-border/50 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground line-through">
                      {risk.title}
                    </span>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {risk.explanation}
                    </p>
                  </div>
                  <form action={reopenRisk}>
                    <Button variant="ghost" size="sm" type="submit" className="text-[11px] h-7">
                      Reopen
                    </Button>
                  </form>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function RiskRadarPage(props: RiskRadarPageProps) {
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
      <RiskRadarContent {...props} />
    </Suspense>
  );
}
