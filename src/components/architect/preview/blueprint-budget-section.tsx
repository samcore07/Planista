/**
 * @fileoverview Budget Category Allocations section for the Event Blueprint Preview.
 */

"use client";

import * as React from "react";
import { IndianRupee, AlertTriangle, Plus, Pencil, Trash2 } from "lucide-react";
import { BudgetAllocationBlueprint } from "@/types/blueprint.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

interface BlueprintBudgetSectionProps {
  categories: BudgetAllocationBlueprint[];
  currency?: string;
  totalTargetBudget: number;
  totalAllocated: number;
  totalAllocatedPercent: number;
  isBudgetOver: boolean;
  overAmount: number;
  isSelected: boolean;
  onToggleSection: () => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (index: number) => void;
  onDeleteCategory: (index: number) => void;
}

export function BlueprintBudgetSection({
  categories,
  currency = "INR",
  totalTargetBudget,
  totalAllocated,
  totalAllocatedPercent,
  isBudgetOver,
  overAmount,
  isSelected,
  onToggleSection,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteCategory,
}: BlueprintBudgetSectionProps) {
  return (
    <Card
      className={cn(
        "transition-all",
        isBudgetOver && isSelected
          ? "border-destructive/60 bg-destructive/5"
          : isSelected
          ? "border-primary/50"
          : "opacity-60 border-border"
      )}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sec-budget"
            aria-label="Include budget categories"
            checked={isSelected}
            onChange={onToggleSection}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />
              Budget Categories ({categories.length})
            </CardTitle>
            <CardDescription
              className={cn(
                "text-xs transition-colors",
                isBudgetOver
                  ? "text-destructive font-semibold flex items-center gap-1.5"
                  : "text-muted-foreground"
              )}
            >
              {isBudgetOver && (
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              )}
              <span>
                Allocates {totalAllocatedPercent}% ({formatCurrency(totalAllocated, currency)}) of the {currency} {totalTargetBudget.toLocaleString()} target
                {isBudgetOver && (
                  <span className="font-bold ml-1">
                    — Exceeds target by {formatCurrency(overAmount, currency)} ({totalAllocatedPercent - 100}%)
                  </span>
                )}
              </span>
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAddModal}
            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Category
          </Button>
          {isBudgetOver && isSelected && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Exceeds 100%
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {isSelected ? "Accepted" : "Excluded"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isBudgetOver && isSelected && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 mb-3.5 flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Budget allocations exceed 100% target:</span>
              <p className="text-[11px] leading-relaxed">
                Total allocated is {formatCurrency(totalAllocated, currency)} ({totalAllocatedPercent}%), which exceeds the {currency} {totalTargetBudget.toLocaleString()} target by {formatCurrency(overAmount, currency)}. You must reduce or remove category allocations to 100% or less before you can save and proceed.
              </p>
            </div>
          </div>
        )}
        {categories.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
            No budget categories defined. Click &ldquo;Add Category&rdquo; to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {categories.map((cat, i) => (
              <div
                key={i}
                className="group relative p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex justify-between items-start font-medium gap-2">
                  <span className="text-foreground font-semibold line-clamp-1">
                    {cat.category}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(i)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                      title="Edit category"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(i)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background/80 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="text-primary font-semibold text-xs">
                  {formatCurrency(cat.suggestedAmount, currency)} ({cat.percentage}%)
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {cat.rationale || "No specific rationale specified."}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
