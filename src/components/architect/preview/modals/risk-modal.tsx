/**
 * @fileoverview Modal dialog for adding or editing a Risk / Contingency Safeguard.
 */

"use client";

import * as React from "react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContingencyBlueprint } from "@/types/blueprint.types";

interface RiskModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData: ContingencyBlueprint;
  onClose: () => void;
  onSave: (risk: ContingencyBlueprint) => void;
}

function RiskModalContent({
  mode,
  initialData,
  onClose,
  onSave,
}: Omit<RiskModalProps, "isOpen">) {
  const [data, setData] = React.useState<ContingencyBlueprint>(initialData);

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
        aria-labelledby="risk-modal-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3
            id="risk-modal-title"
            className="font-serif text-lg font-semibold text-foreground flex items-center gap-2"
          >
            <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
            {mode === "add" ? "Add Contingency Safeguard" : "Edit Safeguard"}
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
            <Label htmlFor="rsk-title" className="text-xs">
              Risk Title
            </Label>
            <Input
              id="rsk-title"
              placeholder="e.g. Inclement Weather / Rain Plan"
              value={data.riskTitle}
              onChange={(e) =>
                setData((prev) => ({ ...prev, riskTitle: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rsk-impact" className="text-xs">
                Impact
              </Label>
              <select
                id="rsk-impact"
                value={data.impact}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    impact: e.target.value as ContingencyBlueprint["impact"],
                  }))
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rsk-prob" className="text-xs">
                Probability
              </Label>
              <select
                id="rsk-prob"
                value={data.probability}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    probability: e.target.value as ContingencyBlueprint["probability"],
                  }))
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rsk-plan" className="text-xs">
              Contingency & Mitigation Plan
            </Label>
            <Textarea
              id="rsk-plan"
              rows={3}
              placeholder="Concrete steps or backup vendors ready to deploy..."
              value={data.contingencyPlan}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  contingencyPlan: e.target.value,
                }))
              }
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
              {mode === "add" ? "Add Safeguard" : "Update Safeguard"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RiskModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSave,
}: RiskModalProps) {
  if (!isOpen) return null;
  return (
    <RiskModalContent
      mode={mode}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
