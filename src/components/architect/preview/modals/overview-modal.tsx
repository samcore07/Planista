/**
 * @fileoverview Modal dialog for editing Event Blueprint overview title and description.
 */

"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface OverviewModalProps {
  isOpen: boolean;
  initialTitle: string;
  initialDescription: string;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
}

function OverviewModalContent({
  initialTitle,
  initialDescription,
  onClose,
  onSave,
}: Omit<OverviewModalProps, "isOpen">) {
  const [title, setTitle] = React.useState(initialTitle);
  const [description, setDescription] = React.useState(initialDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(title, description);
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
        aria-labelledby="overview-modal-title"
        className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3
            id="overview-modal-title"
            className="font-serif text-lg font-semibold text-foreground"
          >
            Edit Event Blueprint Overview
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
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="ov-title" className="text-xs">
              Event Blueprint Title
            </Label>
            <Input
              id="ov-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ov-desc" className="text-xs">
              Concept Description
            </Label>
            <Textarea
              id="ov-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
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
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OverviewModal({
  isOpen,
  initialTitle,
  initialDescription,
  onClose,
  onSave,
}: OverviewModalProps) {
  if (!isOpen) return null;
  return (
    <OverviewModalContent
      initialTitle={initialTitle}
      initialDescription={initialDescription}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
