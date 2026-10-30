/**
 * @fileoverview Contingencies & Risk Safeguards section for the Event Blueprint Preview.
 */

"use client";

import * as React from "react";
import { ShieldAlert, Plus, Pencil, Trash2 } from "lucide-react";
import { ContingencyBlueprint } from "@/types/blueprint.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BlueprintRisksSectionProps {
  contingencies: ContingencyBlueprint[];
  isSelected: boolean;
  onToggleSection: () => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (index: number) => void;
  onDeleteRisk: (index: number) => void;
}

export function BlueprintRisksSection({
  contingencies,
  isSelected,
  onToggleSection,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteRisk,
}: BlueprintRisksSectionProps) {
  return (
    <Card
      className={`transition-all ${
        isSelected ? "border-primary/50" : "opacity-60 border-border"
      }`}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sec-risks"
            aria-label="Include contingencies and safeguards"
            checked={isSelected}
            onChange={onToggleSection}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Contingencies & Risk Safeguards ({contingencies.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Proactive mitigations for logistics, weather, and operational friction
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
            Add Safeguard
          </Button>
          <Badge variant="secondary" className="text-xs">
            {isSelected ? "Accepted" : "Excluded"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {contingencies.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
            No contingencies defined. Click &ldquo;Add Safeguard&rdquo; to add one.
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {contingencies.map((c, i) => (
              <div
                key={i}
                className="p-3 rounded-md bg-secondary/40 border border-border/50 space-y-1 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{c.riskTitle}</span>
                    <Badge
                      variant={c.impact === "high" ? "destructive" : "outline"}
                      className="text-[9px] uppercase px-1.5 py-0"
                    >
                      {c.impact} impact
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(i)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                      title="Edit risk"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRisk(i)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background/80 transition-colors"
                      title="Delete risk"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <strong>Mitigation Plan:</strong> {c.contingencyPlan}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
