/**
 * @fileoverview Modal dialog for adding or editing a Milestone Task.
 */

"use client";

import * as React from "react";
import { Calendar, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskBlueprint, recommendProcessHours } from "@/types/blueprint.types";

interface TaskModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData: TaskBlueprint;
  onClose: () => void;
  onSave: (task: TaskBlueprint) => void;
}

function TaskModalContent({
  mode,
  initialData,
  onClose,
  onSave,
}: Omit<TaskModalProps, "isOpen">) {
  const [data, setData] = React.useState<TaskBlueprint>({
    ...initialData,
    estimatedDurationHours: initialData.estimatedDurationHours ?? 2.0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };

  const handlePriorityChange = (newPriority: TaskBlueprint["priority"]) => {
    const recHours = recommendProcessHours(newPriority, data.category, data.title);
    setData((prev) => ({
      ...prev,
      priority: newPriority,
      estimatedDurationHours: recHours,
    }));
  };

  const handleAutoRecommend = () => {
    const rec = recommendProcessHours(data.priority, data.category, data.title);
    setData((prev) => ({
      ...prev,
      estimatedDurationHours: rec,
    }));
  };

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3
            id="task-modal-title"
            className="font-serif text-lg font-semibold text-foreground flex items-center gap-2"
          >
            <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
            {mode === "add" ? "Add Milestone Task" : "Edit Milestone Task"}
          </h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="tsk-title" className="text-xs">
              Task Title
            </Label>
            <Input
              id="tsk-title"
              placeholder="e.g. Schedule Cake Tasting Session"
              value={data.title}
              onChange={(e) =>
                setData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tsk-desc" className="text-xs">
              Description & Deliverables
            </Label>
            <Textarea
              id="tsk-desc"
              rows={2}
              placeholder="Details on what needs to be verified..."
              value={data.description}
              onChange={(e) =>
                setData((prev) => ({ ...prev, description: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tsk-priority" className="text-xs">
                Priority
              </Label>
              <select
                id="tsk-priority"
                value={data.priority}
                onChange={(e) =>
                  handlePriorityChange(
                    e.target.value as TaskBlueprint["priority"]
                  )
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tsk-days" className="text-xs">
                Days Before (T-X)
              </Label>
              <Input
                id="tsk-days"
                type="number"
                min="0"
                max="730"
                value={data.relativeDaysBeforeEvent}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    relativeDaysBeforeEvent: Number(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="tsk-duration"
                  className="text-xs flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  Process Hours
                </Label>
                <button
                  type="button"
                  onClick={handleAutoRecommend}
                  className="text-[10px] text-primary hover:underline cursor-pointer"
                  title="Auto recommend based on task details and priority"
                >
                  Auto
                </button>
              </div>
              <div className="relative">
                <Input
                  id="tsk-duration"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="100"
                  value={data.estimatedDurationHours ?? 2}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      estimatedDurationHours:
                        Number(e.target.value) || 0.5,
                    }))
                  }
                  className="pr-8"
                  required
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                  hrs
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {mode === "add" ? "Add Task" : "Update Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TaskModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSave,
}: TaskModalProps) {
  if (!isOpen) return null;
  return (
    <TaskModalContent
      mode={mode}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
