"use client";

import * as React from "react";
import { CriticalPathAnalysis } from "@/services/logistics.service";
import {
  Flame,
  ArrowRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CriticalPathAnalyzerProps {
  analysis: CriticalPathAnalysis;
}

export function CriticalPathAnalyzer({ analysis }: CriticalPathAnalyzerProps) {
  const [filterMode, setFilterMode] = React.useState<"all" | "critical" | "buffered">("all");

  const filteredTasks = React.useMemo(() => {
    if (filterMode === "critical") return analysis.allTasks.filter((t) => t.isCritical);
    if (filterMode === "buffered") return analysis.allTasks.filter((t) => !t.isCritical && t.totalSlack > 0);
    return analysis.allTasks;
  }, [analysis.allTasks, filterMode]);

  // Max duration or slack for relative bar sizing
  const maxBarValue = Math.max(
    1,
    ...analysis.allTasks.map((t) => t.durationHours + t.totalSlack)
  );

  return (
    <div className="relative rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/60 to-background/90 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-primary/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <Flame className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg font-bold tracking-tight text-foreground">
              Critical Path & Slack Float Analyzer
            </h2>
            <Badge variant="destructive" className="text-xs font-mono font-medium">
              {analysis.criticalTaskCount} Critical Milestones
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            CPM algorithm calculating early/late start intervals, slack variance, and delay sensitivities.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border/70 bg-background/50 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
              filterMode === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({analysis.allTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("critical")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
              filterMode === "critical"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Critical Path ({analysis.criticalTaskCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("buffered")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
              filterMode === "buffered"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Buffered ({analysis.nonCriticalTaskCount})
          </button>
        </div>
      </div>

      {/* Critical Path Sequential Flow Ribbon */}
      <div className="mt-5 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Zero-Tolerance Critical Sequence (Total Duration: {analysis.totalProjectDurationHours} hrs)
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Any delay on these milestones directly postpones final event delivery
          </span>
        </div>

        {analysis.criticalPath.length === 0 ? (
          <p className="text-xs text-muted-foreground">No critical sequence identified.</p>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
            {analysis.criticalPath.map((t, idx) => (
              <React.Fragment key={t.id}>
                <div className="shrink-0 flex items-center gap-2 p-2.5 rounded-lg border border-rose-500/30 bg-card/90 shadow-xs hover:border-rose-500 hover:scale-105 transition-all">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="font-medium text-[11px] text-foreground max-w-[140px] truncate" title={t.title}>
                      {t.title}
                    </h5>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {t.durationHours} hrs • T-{t.dueDate ? t.dueDate.split("T")[0] : "due"}
                    </span>
                  </div>
                </div>
                {idx < analysis.criticalPath.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Slack Comparison & Float Waterfall Table */}
      <div className="mt-5 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2 font-mono">
          <span>Milestone Discipline & Title</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">Execution Duration vs Float Buffer</span>
            <span>Slack Status</span>
          </div>
        </div>

        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
          {filteredTasks.map((task) => {
            const durationWidth = Math.max(5, (task.durationHours / maxBarValue) * 100);
            const slackWidth = Math.max(0, (task.totalSlack / maxBarValue) * 100);

            return (
              <div
                key={task.id}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs",
                  task.isCritical
                    ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60"
                    : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card"
                )}
              >
                {/* Title & Category */}
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate max-w-[220px]" title={task.title}>
                      {task.title}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-mono">
                      {task.category || "General"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    ES: {task.earlyStart}h • EF: {task.earlyFinish}h • LS: {task.lateStart}h • LF: {task.lateFinish}h
                  </p>
                </div>

                {/* Comparative Dual Bar */}
                <div className="flex items-center gap-4 shrink-0 sm:w-64">
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {task.durationHours}h exec
                      </span>
                      <span className={task.isCritical ? "text-rose-500 font-bold" : "text-blue-500"}>
                        {task.isCritical ? "0.0h slack" : `+${task.totalSlack}h slack`}
                      </span>
                    </div>

                    <div className="h-2 w-full flex rounded-full bg-secondary overflow-hidden">
                      {/* Duration part */}
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${durationWidth}%` }}
                        title={`Duration: ${task.durationHours} hrs`}
                      />
                      {/* Slack Float part */}
                      {task.totalSlack > 0 && (
                        <div
                          className="bg-blue-400 dark:bg-blue-500/60 transition-all duration-500"
                          style={{ width: `${slackWidth}%` }}
                          title={`Slack Buffer: ${task.totalSlack} hrs`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Status Chip */}
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold",
                      task.isCritical
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    )}
                  >
                    {task.isCritical ? "Critical" : "Buffered"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
