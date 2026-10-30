/**
 * @fileoverview Modal dialog for adding or editing a Budget Allocation Category.
 */

"use client";

import * as React from "react";
import { IndianRupee, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BudgetAllocationBlueprint } from "@/types/blueprint.types";

interface BudgetModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData: BudgetAllocationBlueprint;
  currency?: string;
  totalTargetBudget: number;
  onClose: () => void;
  onSave: (category: BudgetAllocationBlueprint) => void;
}

function BudgetModalContent({
  mode,
  initialData,
  currency = "INR",
  totalTargetBudget,
  onClose,
  onSave,
}: Omit<BudgetModalProps, "isOpen">) {
  const [data, setData] = React.useState<BudgetAllocationBlueprint>(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(data.suggestedAmount || 0);
    const calculatedPercentage =
      totalTargetBudget > 0 ? Math.round((amount / totalTargetBudget) * 100) : 0;

    onSave({
      ...data,
      suggestedAmount: amount,
      percentage: calculatedPercentage,
    });
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
        aria-labelledby="budget-modal-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3
            id="budget-modal-title"
            className="font-serif text-lg font-semibold text-foreground flex items-center gap-2"
          >
            <IndianRupee className="h-4 w-4 text-primary" aria-hidden="true" />
            {mode === "add" ? "Add Budget Category" : "Edit Budget Category"}
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
            <Label htmlFor="bg-cat" className="text-xs">
              Category Name
            </Label>
            <Input
              id="bg-cat"
              placeholder="e.g. Photography & Drone Video"
              value={data.category}
              onChange={(e) =>
                setData((prev) => ({ ...prev, category: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bg-amount" className="text-xs">
              Allocated Amount ({currency})
            </Label>
            <Input
              id="bg-amount"
              type="number"
              min="0"
              step="50"
              value={data.suggestedAmount || ""}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  suggestedAmount: Number(e.target.value),
                }))
              }
              required
            />
            {totalTargetBudget > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Represents approx{" "}
                {Math.round(
                  ((data.suggestedAmount || 0) / totalTargetBudget) * 100
                )}
                % of total target
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bg-rationale" className="text-xs">
              Rationale & Scope
            </Label>
            <Textarea
              id="bg-rationale"
              rows={3}
              placeholder="Scope of vendor deliverables or cost assumptions..."
              value={data.rationale}
              onChange={(e) =>
                setData((prev) => ({ ...prev, rationale: e.target.value }))
              }
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
              {mode === "add" ? "Add to Blueprint" : "Update Category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BudgetModal({
  isOpen,
  mode,
  initialData,
  currency,
  totalTargetBudget,
  onClose,
  onSave,
}: BudgetModalProps) {
  if (!isOpen) return null;
  return (
    <BudgetModalContent
      mode={mode}
      initialData={initialData}
      currency={currency}
      totalTargetBudget={totalTargetBudget}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
