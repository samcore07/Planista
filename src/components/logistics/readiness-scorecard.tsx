"use client";

import * as React from "react";
import {
  OperationalReadinessReport,
} from "@/services/logistics.service";
import {
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadinessScorecardProps {
  report: OperationalReadinessReport;
}

export function ReadinessScorecard({ report }: ReadinessScorecardProps) {
  const [hoveredDim, setHoveredDim] = React.useState<string | null>(null);

  // SVG Gauge calculations (radius = 54, circumference = 2 * PI * 54 = ~339.29)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (report.overallScore / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card/90 via-card/60 to-background/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-2xl">
      {/* Decorative ambient background glows */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl transition-all duration-500"
        style={{ backgroundColor: report.tierColor }}
      />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/10 opacity-30 blur-2xl" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg font-bold tracking-tight text-foreground">
              Live Operational Readiness
            </h2>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs transition-colors",
                report.tierBadgeClass
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: report.tierColor }}
              />
              {report.tier}
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            {report.summary}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
              Confidence Index
            </span>
            <span className="text-xs font-medium text-foreground">
              4 Disciplines Monitored
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Radial Gauge + Dimension Cards */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-center">
        {/* Radial SVG Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-background/50 border border-border/50 backdrop-blur-md shadow-inner">
          <div className="relative flex items-center justify-center">
            <svg
              className="w-40 h-40 -rotate-90 transform"
              viewBox="0 0 130 130"
            >
              <defs>
                <linearGradient
                  id="readinessGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor={report.tierColor} />
                </linearGradient>
                <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Background track */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                className="stroke-muted/30"
                strokeWidth="10"
                fill="none"
              />

              {/* Progress ring */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="url(#readinessGradient)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                filter="url(#gaugeShadow)"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-foreground transition-all">
                {report.overallScore}
                <span className="text-sm font-normal text-muted-foreground">%</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                Readiness Score
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Optimal: ≥85%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Caution: 50-84%
            </span>
          </div>
        </div>

        {/* 4 Dimension Cards Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {report.dimensions.map((dim, idx) => {
            const isHovered = hoveredDim === dim.name;
            const statusColor =
              dim.status === "optimal"
                ? "bg-emerald-500"
                : dim.status === "good"
                ? "bg-blue-500"
                : dim.status === "warning"
                ? "bg-amber-500"
                : "bg-rose-500";

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredDim(dim.name)}
                onMouseLeave={() => setHoveredDim(null)}
                className={cn(
                  "group relative rounded-xl border border-border/60 bg-card/70 p-4 transition-all duration-200 cursor-default",
                  "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:bg-card",
                  isHovered && "ring-1 ring-primary/30"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                    {dim.name}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                    <span>{dim.score}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      /100
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/80 mb-2.5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      statusColor
                    )}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">{dim.metric}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/80">
                    Weight {Math.round(dim.weight * 100)}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
                  {dim.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
