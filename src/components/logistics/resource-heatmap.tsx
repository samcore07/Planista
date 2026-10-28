"use client";

import * as React from "react";
import { ResourceHeatmap, HeatmapCell } from "@/services/logistics.service";
import {
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ResourceHeatmapProps {
  heatmap: ResourceHeatmap;
}

export function ResourceHeatmapComponent({ heatmap }: ResourceHeatmapProps) {
  const [selectedCell, setSelectedCell] = React.useState<HeatmapCell | null>(null);

  return (
    <div className="relative rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/60 to-background/90 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-primary/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg font-bold tracking-tight text-foreground">
              Resource Utilization Heatmap
            </h2>
            <Badge variant="outline" className="text-xs font-mono font-normal">
              Peak: {heatmap.peakHours} hrs / cell
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Workload distribution across production disciplines and chronological delivery phases.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-secondary/50 border border-border" />
            0h
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500/25 border border-emerald-500/30" />
            Light
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-amber-500/30 border border-amber-500/40" />
            Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-rose-500/35 border border-rose-500/50" />
            Intensive
          </span>
        </div>
      </div>

      {/* Heatmap Grid Table */}
      <div className="mt-5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
        <div className="min-w-[620px]">
          {/* Phase Column Headers */}
          <div className="grid grid-cols-6 gap-2 mb-2 font-mono text-xs">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold self-end pb-1">
              Discipline
            </div>
            {heatmap.phases.map((phase) => (
              <div
                key={phase.id}
                className="text-center p-2 rounded-lg bg-secondary/40 border border-border/40"
              >
                <div className="font-semibold text-foreground text-[11px] truncate">
                  {phase.label}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {phase.range}
                </div>
              </div>
            ))}
          </div>

          {/* Category Rows */}
          <div className="space-y-2">
            {heatmap.matrix.map((row, rowIdx) => {
              const categoryName = heatmap.categories[rowIdx];
              const rowTotalHours = row.reduce((sum, cell) => sum + cell.totalHours, 0);

              return (
                <div key={rowIdx} className="grid grid-cols-6 gap-2 items-center">
                  {/* Category Title Column */}
                  <div className="pr-2 truncate" title={categoryName}>
                    <span className="font-medium text-xs text-foreground block truncate">
                      {categoryName}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {Math.round(rowTotalHours * 10) / 10} hrs total
                    </span>
                  </div>

                  {/* Heatmap Cells */}
                  {row.map((cell) => {
                    const hasTasks = cell.taskCount > 0;
                    const isSelected =
                      selectedCell?.category === cell.category &&
                      selectedCell?.phaseId === cell.phaseId;

                    // Color ramp based on intensity
                    let cellBg = "bg-secondary/20 border-border/40 text-muted-foreground/60";
                    if (hasTasks) {
                      if (cell.intensity > 60) {
                        cellBg = "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 shadow-xs";
                      } else if (cell.intensity > 30) {
                        cellBg = "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40";
                      } else {
                        cellBg = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
                      }
                    }

                    return (
                      <button
                        type="button"
                        key={cell.phaseId}
                        onClick={() => setSelectedCell(hasTasks ? cell : null)}
                        className={cn(
                          "relative h-14 rounded-xl border p-2 flex flex-col justify-between items-center transition-all duration-200 cursor-pointer text-left",
                          cellBg,
                          hasTasks && "hover:scale-105 hover:z-10 hover:shadow-lg",
                          isSelected && "ring-2 ring-primary border-primary scale-105 z-20 shadow-xl"
                        )}
                      >
                        <span className="font-mono text-xs font-bold">
                          {hasTasks ? `${cell.totalHours}h` : "—"}
                        </span>
                        <span className="text-[9px] font-mono opacity-80">
                          {hasTasks ? `${cell.taskCount} task${cell.taskCount === 1 ? "" : "s"}` : "idle"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Cell Task Inspector Drawer */}
      {selectedCell && (
        <div className="mt-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-xs animate-in fade-in duration-200 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div>
              <span className="font-semibold text-foreground text-sm">
                {selectedCell.category} • {selectedCell.phaseLabel}
              </span>
              <span className="text-muted-foreground font-mono text-[11px] ml-2">
                ({selectedCell.totalHours} hrs allocated)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedCell.tasks.map((t) => (
              <div
                key={t.id}
                className="p-2 rounded-lg bg-card/80 border border-border/60 flex items-center justify-between gap-2"
              >
                <div className="space-y-0.5 truncate">
                  <span className="font-medium text-foreground text-[11px] block truncate">
                    {t.title}
                  </span>
                  <span className="text-[9px] font-mono uppercase text-muted-foreground">
                    {t.priority} • {t.status}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-foreground shrink-0">
                  {t.hours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
