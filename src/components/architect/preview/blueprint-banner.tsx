/**
 * @fileoverview Top Banner and Executive Summary component for the Event Blueprint Preview.
 */

"use client";

import * as React from "react";
import {
  Check,
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
  Pencil,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { EventBlueprint } from "@/types/blueprint.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

interface BlueprintBannerProps {
  blueprint: EventBlueprint;
  currency?: string;
  isPersisting: boolean;
  isSaveBlockedByBudget: boolean;
  overAmount: number;
  totalAllocatedPercent: number;
  onEditOverview: () => void;
  onResetToAIDraft: () => void;
  onAdjustAndRegenerate: () => void;
  onPersist: () => void;
}

export function BlueprintBanner({
  blueprint,
  currency = "INR",
  isPersisting,
  isSaveBlockedByBudget,
  overAmount,
  totalAllocatedPercent,
  onEditOverview,
  onResetToAIDraft,
  onAdjustAndRegenerate,
  onPersist,
}: BlueprintBannerProps) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              AI Event Blueprint Ready
            </Badge>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              Editable draft — customize any section below
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              {blueprint.overview.title}
            </h2>
            <button
              type="button"
              onClick={onEditOverview}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Edit title & overview"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onResetToAIDraft}
            className="gap-1.5 text-xs"
            disabled={isPersisting}
            title="Reset all manual edits to the original AI recommendation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Edits
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAdjustAndRegenerate}
            className="gap-1.5 text-xs"
            disabled={isPersisting}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Adjust & Regenerate
          </Button>
          <Button
            size="sm"
            onClick={onPersist}
            disabled={isPersisting || isSaveBlockedByBudget}
            className={cn(
              "gap-1.5 text-xs shadow-sm transition-all",
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
                Persisting Plan...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Accept & Open Event
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {blueprint.overview.description}
      </p>

      {/* Assumptions & Uncertainties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
        <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
          <span className="font-medium text-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Architectural Assumptions
          </span>
          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
            {blueprint.overview.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
          <span className="font-medium text-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Identified Uncertainties
          </span>
          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
            {blueprint.overview.uncertainties.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Important Disclaimer */}
      <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          <strong>Vendor Notice:</strong> Planista never states that a vendor is confirmed or a quote is verified without explicit signed documentation. All suggested figures and vendor archetypes are market estimates.
        </span>
      </div>
    </div>
  );
}
