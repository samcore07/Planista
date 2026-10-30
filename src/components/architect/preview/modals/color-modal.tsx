/**
 * @fileoverview Modal dialog for adding or editing a Theme Color Swatch.
 */

"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData: { name: string; hex: string };
  onClose: () => void;
  onSave: (color: { name: string; hex: string }) => void;
}

function ColorModalContent({
  mode,
  initialData,
  onClose,
  onSave,
}: Omit<ColorModalProps, "isOpen">) {
  const [data, setData] = React.useState<{ name: string; hex: string }>(initialData);

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
        aria-labelledby="color-modal-title"
        className="relative w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h3
            id="color-modal-title"
            className="font-serif text-base font-semibold text-foreground"
          >
            {mode === "add" ? "Add Color Swatch" : "Edit Color Swatch"}
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
            <Label htmlFor="col-name" className="text-xs">
              Color Name
            </Label>
            <Input
              id="col-name"
              placeholder="e.g. Sage Green"
              value={data.name}
              onChange={(e) =>
                setData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="col-hex" className="text-xs">
              Hex Color Code
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="col-picker"
                value={data.hex}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, hex: e.target.value }))
                }
                className="h-8 w-10 p-0 border border-border rounded cursor-pointer bg-transparent"
              />
              <Input
                id="col-hex"
                value={data.hex}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, hex: e.target.value }))
                }
                placeholder="#4F46E5"
                className="font-mono text-xs"
                required
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
              {mode === "add" ? "Add Swatch" : "Save Color"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ColorModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSave,
}: ColorModalProps) {
  if (!isOpen) return null;
  return (
    <ColorModalContent
      mode={mode}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
