"use client";

import * as React from "react";
import { DisciplineBreakdownItem } from "@/services/logistics.service";
import { PieChart, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisciplineChartsProps {
  disciplineBreakdown: DisciplineBreakdownItem[];
  priorityBreakdown: {
    priority: "critical" | "high" | "medium" | "low";
    total: number;
    completed: number;
    hours: number;
  }[];
}

export function DisciplineCharts({
  disciplineBreakdown,
  priorityBreakdown,
}: DisciplineChartsProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const grandTotalHours = disciplineBreakdown.reduce(
    (sum, d) => sum + d.totalHours,
    0
  );

  // Donut SVG circumference calculation
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = React.useMemo(() => {
    const prefixSums = disciplineBreakdown.reduce<number[]>((acc, item, i) => {
      acc.push((acc[i] ?? 0) + item.percentage);
      return acc;
    }, [0]);

    return disciplineBreakdown.map((item, idx) => {
      const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -(((prefixSums[idx] ?? 0) / 100) * circumference);
      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
        index: idx,
      };
    });
  }, [disciplineBreakdown, circumference]);

  const activeItem =
    hoveredIndex !== null
      ? disciplineBreakdown[hoveredIndex]
      : disciplineBreakdown[0] || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Discipline Workload Donut Chart (Col 6) */}
      <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/60 to-background/90 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-primary/40">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="space-y-1">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Work Breakdown by Discipline
            </h3>
            <p className="text-xs text-muted-foreground">
              Hour share and labor distribution across operational silos.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-foreground">
            {grandTotalHours} hrs total
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Interactive SVG Donut */}
          <div className="sm:col-span-6 flex items-center justify-center relative">
            <svg
              className="w-44 h-44 -rotate-90 transform"
              viewBox="0 0 140 140"
            >
              {/* Background circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="stroke-muted/20"
                strokeWidth="14"
                fill="none"
              />

              {/* Segments */}
              {donutSegments.map((seg) => {
                const isHovered = hoveredIndex === seg.index;
                return (
                  <circle
                    key={seg.category}
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke={seg.color}
                    strokeWidth={isHovered ? 18 : 14}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    fill="none"
                    onMouseEnter={() => setHoveredIndex(seg.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  />
                );
              })}
            </svg>

            {/* Donut Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
              {activeItem ? (
                <>
                  <span className="font-mono text-2xl font-black text-foreground">
                    {activeItem.percentage}%
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium max-w-[90px] truncate">
                    {activeItem.category}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground font-mono">
                  {grandTotalHours}h
                </span>
              )}
            </div>
          </div>

          {/* Donut Legend */}
          <div className="sm:col-span-6 space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
            {disciplineBreakdown.map((item, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <div
                  key={item.category}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    "flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer",
                    isHovered ? "bg-secondary font-medium" : "hover:bg-secondary/40"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate max-w-[110px] text-foreground">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground shrink-0">
                    <span>{item.totalHours}h</span>
                    <span className="font-semibold text-foreground w-8 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Priority Velocity Horizon Bars (Col 6) */}
      <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/60 to-background/90 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-primary/40">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="space-y-1">
            <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Completion Velocity by Priority
            </h3>
            <p className="text-xs text-muted-foreground">
              Progress trajectory split across risk & impact tiers.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {priorityBreakdown.map((pb) => {
            const completionPct =
              pb.total > 0 ? Math.round((pb.completed / pb.total) * 100) : 0;

            const priorityColor =
              pb.priority === "critical"
                ? "bg-rose-500"
                : pb.priority === "high"
                ? "bg-amber-500"
                : pb.priority === "medium"
                ? "bg-blue-500"
                : "bg-slate-400";

            return (
              <div key={pb.priority} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-mono font-bold text-[11px] text-foreground">
                      {pb.priority}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({pb.hours} hrs total)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-muted-foreground">
                      {pb.completed}/{pb.total} done
                    </span>
                    <span className="font-bold text-foreground">
                      {completionPct}%
                    </span>
                  </div>
                </div>

                <div className="h-3 w-full rounded-full bg-secondary overflow-hidden p-0.5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      priorityColor
                    )}
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
