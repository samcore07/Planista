"use client";

import * as React from "react";
import { Plus, X, Layers } from "lucide-react";
import { createCategoryAction } from "@/app/events/[eventId]/budget/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CategoryModalProps {
  eventId: string;
}

export function CategoryModal({ eventId }: CategoryModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);

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
    createCategoryAction(eventId, formData);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        New Category
      </Button>

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
            aria-labelledby="category-modal-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 id="category-modal-title" className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
                Add Budget Category
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
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Venue & Rentals, Catering & Bar, Photography"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="allocatedAmount">Allocated Budget Cap (INR)</Label>
                <Input
                  id="allocatedAmount"
                  name="allocatedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Create Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
