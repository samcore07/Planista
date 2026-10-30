/**
 * @fileoverview Checklist & Task Milestones section for the Event Blueprint Preview.
 */

"use client";

import * as React from "react";
import { Calendar, Clock, Plus, Pencil, Trash2 } from "lucide-react";
import { TaskBlueprint } from "@/types/blueprint.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BlueprintTasksSectionProps {
  tasks: TaskBlueprint[];
  isSelected: boolean;
  onToggleSection: () => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (index: number) => void;
  onDeleteTask: (index: number) => void;
}

export function BlueprintTasksSection({
  tasks,
  isSelected,
  onToggleSection,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteTask,
}: BlueprintTasksSectionProps) {
  const totalHours = tasks.reduce(
    (sum, t) => sum + (Number(t.estimatedDurationHours) || 2),
    0
  );

  return (
    <Card
      className={`transition-all ${
        isSelected ? "border-primary/50" : "opacity-60 border-border"
      }`}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sec-tasks"
            aria-label="Include checklist and tasks"
            checked={isSelected}
            onChange={onToggleSection}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Checklist & Task Milestones ({tasks.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological schedule with prerequisite dependency tracking
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <Badge
              variant="outline"
              className="text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-normal"
            >
              <Clock className="w-3 h-3" />
              {totalHours} hrs total
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAddModal}
            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
          <Badge variant="secondary" className="text-xs">
            {isSelected ? "Accepted" : "Excluded"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
            No milestone tasks defined. Click &ldquo;Add Task&rdquo; to create one.
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {tasks.map((t, i) => (
              <div
                key={i}
                className="p-3 rounded-md bg-secondary/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-primary/30 transition-colors"
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{t.title}</span>
                    <Badge
                      variant={
                        t.priority === "critical" || t.priority === "high"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[9px] uppercase px-1.5 py-0"
                    >
                      {t.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {t.description}
                  </p>
                  {t.dependsOnTitles.length > 0 && (
                    <p className="text-[10px] text-primary">
                      Depends on: {t.dependsOnTitles.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <span
                    className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]"
                    title="Auto-recommended process time"
                  >
                    <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {t.estimatedDurationHours ?? 2}{" "}
                    {Number(t.estimatedDurationHours ?? 2) === 1 ? "hr" : "hrs"}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    T-{t.relativeDaysBeforeEvent} days
                  </span>
                  <div className="flex items-center gap-1 border-l border-border/60 pl-2">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(i)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                      title="Edit task"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(i)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background/80 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
