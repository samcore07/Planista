/**
 * @fileoverview Modal dialog for editing Theme & Styling direction.
 */

"use client";

import * as React from "react";
import { Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeBlueprint } from "@/types/blueprint.types";

interface ThemeModalProps {
  isOpen: boolean;
  initialData: ThemeBlueprint;
  onClose: () => void;
  onSave: (theme: ThemeBlueprint) => void;
}

function ThemeModalContent({
  initialData,
  onClose,
  onSave,
}: Omit<ThemeModalProps, "isOpen">) {
  const [data, setData] = React.useState<ThemeBlueprint>(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
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
        aria-labelledby="theme-modal-title"
        className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3
            id="theme-modal-title"
            className="font-serif text-lg font-semibold text-foreground flex items-center gap-2"
          >
            <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
            Edit Theme & Styling Direction
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
            <Label htmlFor="thm-name" className="text-xs">
              Theme Name
            </Label>
            <Input
              id="thm-name"
              value={data.themeName}
              onChange={(e) =>
                setData((prev) => ({ ...prev, themeName: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="thm-concept" className="text-xs">
              Concept Description
            </Label>
            <Textarea
              id="thm-concept"
              rows={3}
              value={data.conceptDescription}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  conceptDescription: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="thm-decor" className="text-xs">
                Decor Direction
              </Label>
              <Input
                id="thm-decor"
                value={data.decorDirection}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    decorDirection: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thm-lighting" className="text-xs">
                Lighting Direction
              </Label>
              <Input
                id="thm-lighting"
                value={data.lightingDirection}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    lightingDirection: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thm-invites" className="text-xs">
                Stationery
              </Label>
              <Input
                id="thm-invites"
                value={data.invitationDirection}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    invitationDirection: e.target.value,
                  }))
                }
              />
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
              Save Theme
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ThemeModal({
  isOpen,
  initialData,
  onClose,
  onSave,
}: ThemeModalProps) {
  if (!isOpen) return null;
  return (
    <ThemeModalContent
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
