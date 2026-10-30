"use client";

import * as React from "react";
import { Plus, X, CalendarCheck } from "lucide-react";
import { TaskRow } from "@/lib/dal/tasks.dal";
import { createTaskAction, updateTaskAction } from "@/app/events/[eventId]/timeline/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TaskModalProps {
  eventId: string;
  task?: TaskRow;
  trigger?: React.ReactNode;
}

export function TaskModal({ eventId, task, trigger }: TaskModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const isEditing = !!task;

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (formData: FormData) => {
    setIsOpen(false);
    if (isEditing && task) {
      void updateTaskAction(eventId, task.id, formData);
    } else {
      void createTaskAction(eventId, formData);
    }
  };

  const formattedDate = task?.due_date
    ? new Date(task.due_date).toISOString().split("T")[0]
    : "";

  return (
    <>
      {trigger ? (
        <span
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          className="cursor-pointer inline-flex"
        >
          {trigger}
        </span>
      ) : (
        <Button size="sm" onClick={() => setIsOpen(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
      )}

      {isOpen && (
        <div
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 id="task-modal-title" className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                {isEditing ? "Edit Checklist Task" : "Create New Task"}
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Schedule Cake Tasting, Sign Florist Retainer"
                  defaultValue={task?.title || ""}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue={task?.priority || "medium"}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={task?.status || "pending"}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={formattedDate}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Discipline / Category</Label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="e.g. Catering, Logistics, Decor"
                    defaultValue={task?.category || ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Input
                    id="assignee"
                    name="assignee"
                    placeholder="e.g. Lead Planner, Maid of Honor, Caterer"
                    defaultValue={task?.assignee || ""}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="estimatedDurationHours">Process Time / Duration (Hours)</Label>
                  <Input
                    id="estimatedDurationHours"
                    name="estimatedDurationHours"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 2.5"
                    defaultValue={task?.estimated_duration_hours ? Number(task.estimated_duration_hours) : ""}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Details & Deliverables</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Specific requirements, vendor contact info, or verification checklist..."
                  defaultValue={task?.description || ""}
                  rows={2}
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  {isEditing ? "Save Changes" : "Create Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
