"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  AlertTriangle,
  Info,
  DollarSign,
  Calendar,
  Palette,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { EventBlueprint } from "@/types/blueprint.types";
import { BlueprintGenerationInput } from "@/lib/ai/provider";
import { persistAcceptedBlueprintAction } from "@/app/events/architect/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BlueprintPreviewProps {
  blueprint: EventBlueprint;
  input: BlueprintGenerationInput;
  onReset: () => void;
}

export function BlueprintPreview({ blueprint, input, onReset }: BlueprintPreviewProps) {
  const router = useRouter();
  const [selectedSections, setSelectedSections] = React.useState({
    budget: true,
    tasks: true,
    vendors: true,
    theme: true,
    risks: true,
  });
  const [isPersisting, setIsPersisting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggleSection = (section: keyof typeof selectedSections) => {
    setSelectedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePersist = async () => {
    setIsPersisting(true);
    setError(null);

    const result = await persistAcceptedBlueprintAction({
      input,
      blueprint,
      selectedSections,
    });

    if (!result.success || !result.eventId) {
      setError(result.error || "Failed to persist accepted blueprint sections");
      setIsPersisting(false);
      return;
    }

    router.push(`/events/${result.eventId}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Banner & Overview */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-1 text-primary border-primary/30">
              AI Event Blueprint Ready
            </Badge>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              {blueprint.overview.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-1.5 text-xs"
              disabled={isPersisting}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Adjust & Regenerate
            </Button>
            <Button
              size="sm"
              onClick={handlePersist}
              disabled={isPersisting}
              className="gap-1.5 text-xs shadow-sm"
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

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Section by Section Selective Persist */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Select Blueprint Sections to Persist
          </h3>
          <span className="text-xs text-muted-foreground">
            Uncheck any module you prefer to architect manually later
          </span>
        </div>

        {/* 1. Budget Categories */}
        <Card className={`transition-all ${selectedSections.budget ? "border-primary/50" : "opacity-60 border-border"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-budget"
                checked={selectedSections.budget}
                onChange={() => toggleSection("budget")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Budget Categories ({blueprint.budgetAllocations.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Allocates 100% of the {input.currency} {Number(input.totalBudget).toLocaleString()} target
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedSections.budget ? "Accepted" : "Excluded"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {blueprint.budgetAllocations.map((cat, i) => (
                <div key={i} className="p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-foreground">{cat.category}</span>
                    <span className="text-primary font-semibold">
                      ${cat.suggestedAmount.toLocaleString()} ({cat.percentage}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {cat.rationale}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 2. Tasks & Milestones */}
        <Card className={`transition-all ${selectedSections.tasks ? "border-primary/50" : "opacity-60 border-border"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-tasks"
                checked={selectedSections.tasks}
                onChange={() => toggleSection("tasks")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Checklist & Task Milestones ({blueprint.tasks.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Chronological schedule with prerequisite dependency tracking
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedSections.tasks ? "Accepted" : "Excluded"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {blueprint.tasks.map((t, i) => (
                <div key={i} className="p-3 rounded-md bg-secondary/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{t.title}</span>
                      <Badge variant={t.priority === "critical" ? "destructive" : "outline"} className="text-[9px] uppercase">
                        {t.priority}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t.description}</p>
                    {t.dependsOnTitles.length > 0 && (
                      <p className="text-[10px] text-primary">
                        Depends on: {t.dependsOnTitles.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground shrink-0">
                    T-{t.relativeDaysBeforeEvent} days
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Theme & Aesthetic */}
        <Card className={`transition-all ${selectedSections.theme ? "border-primary/50" : "opacity-60 border-border"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-theme"
                checked={selectedSections.theme}
                onChange={() => toggleSection("theme")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Theme Direction: {blueprint.theme.themeName}
                </CardTitle>
                <CardDescription className="text-xs">
                  Harmonized color palette, lighting guidelines, and styling
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedSections.theme ? "Accepted" : "Excluded"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-[11px] font-medium">Palette:</span>
              <div className="flex items-center gap-2">
                {blueprint.theme.palette.map((swatch, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-1 rounded border border-border bg-card">
                    <div
                      className="h-5 w-5 rounded-sm border border-black/10"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="text-[10px] text-foreground font-medium pr-1">
                      {swatch.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {blueprint.theme.conceptDescription}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-2.5 rounded bg-secondary/50 border border-border">
                <span className="font-medium text-foreground block mb-0.5">Decor</span>
                <span className="text-muted-foreground">{blueprint.theme.decorDirection}</span>
              </div>
              <div className="p-2.5 rounded bg-secondary/50 border border-border">
                <span className="font-medium text-foreground block mb-0.5">Lighting</span>
                <span className="text-muted-foreground">{blueprint.theme.lightingDirection}</span>
              </div>
              <div className="p-2.5 rounded bg-secondary/50 border border-border">
                <span className="font-medium text-foreground block mb-0.5">Stationery</span>
                <span className="text-muted-foreground">{blueprint.theme.invitationDirection}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Contingencies & Risks */}
        <Card className={`transition-all ${selectedSections.risks ? "border-primary/50" : "opacity-60 border-border"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-risks"
                checked={selectedSections.risks}
                onChange={() => toggleSection("risks")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Contingencies & Risk Safeguards ({blueprint.contingencies.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Proactive mitigations for logistics, weather, and operational friction
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedSections.risks ? "Accepted" : "Excluded"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {blueprint.contingencies.map((c, i) => (
                <div key={i} className="p-3 rounded-md bg-secondary/40 border border-border/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{c.riskTitle}</span>
                    <Badge variant={c.impact === "high" ? "destructive" : "warning"} className="text-[9px] uppercase">
                      {c.impact} impact
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Mitigation Plan:</strong> {c.contingencyPlan}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="sticky bottom-4 z-30 p-4 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-lg flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Ready to save blueprint into your isolated workspace.
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onReset} disabled={isPersisting}>
            Reset
          </Button>
          <Button size="sm" onClick={handlePersist} disabled={isPersisting} className="gap-2">
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
    </div>
  );
}
