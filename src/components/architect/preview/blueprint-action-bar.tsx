/**
 * @fileoverview Bottom sticky action bar for persisting or regenerating the Event Blueprint.
 */

"use client";

import * as React from "react";
import { Check, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

interface BlueprintActionBarProps {
  currency?: string;
  isPersisting: boolean;
  isSaveBlockedByBudget: boolean;
  overAmount: number;
  totalAllocatedPercent: number;
  onReset: () => void;
  onPersist: () => void;
}

export function BlueprintActionBar({
  currency = "INR",
  isPersisting,
  isSaveBlockedByBudget,
  overAmount,
  totalAllocatedPercent,
  onReset,
  onPersist,
}: BlueprintActionBarProps) {
  return (
    <div className="sticky bottom-4 z-30 p-4 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-lg flex items-center justify-between">
      <div className="text-xs max-w-md">
        {isSaveBlockedByBudget ? (
          <span className="text-destructive font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span>
              Cannot save: Budget allocations ({totalAllocatedPercent}%) exceed 100%. Reduce category amounts by {formatCurrency(overAmount, currency)} to proceed.
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Ready to save tailored blueprint into your isolated workspace.
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={isPersisting}
        >
          Regenerate
        </Button>
        <Button
          size="sm"
          onClick={onPersist}
          disabled={isPersisting || isSaveBlockedByBudget}
          className={cn(
            "gap-2 shadow-sm transition-all",
            isSaveBlockedByBudget && "opacity-60 cursor-not-allowed"
          )}
          title={
            isSaveBlockedByBudget
              ? `Allocations exceed budget by ${formatCurrency(overAmount, currency)} (${totalAllocatedPercent - 100}%). Reduce amounts to proceed.`
              : undefined
          }
        >
          {isPersisting ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Persisting...
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Save Accepted Sections & Open Event
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
