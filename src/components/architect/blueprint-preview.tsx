/**
 * @fileoverview Interactive Blueprint Preview and Staging Editor.
 * Renders synthesized event blueprints, category budgets, milestone tasks,
 * and allows real-time pre-database editing before atomic persistence.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  AlertTriangle,
  Info,
  IndianRupee,
  Calendar,
  Palette,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  Clock,
} from "lucide-react";
import {
  EventBlueprint,
  BudgetAllocationBlueprint,
  TaskBlueprint,
  ContingencyBlueprint,
  ThemeBlueprint,
  recommendProcessHours,
} from "@/types/blueprint.types";
import { BlueprintGenerationInput } from "@/lib/ai/provider";
import { persistAcceptedBlueprintAction } from "@/app/events/architect/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BlueprintPreviewProps {
  blueprint: EventBlueprint;
  input: BlueprintGenerationInput;
  onReset: () => void;
}

export function BlueprintPreview({ blueprint: initialBlueprint, input, onReset }: BlueprintPreviewProps) {
  const router = useRouter();

  // Working copy of blueprint that the user can freely customize
  const [blueprint, setBlueprint] = React.useState<EventBlueprint>(initialBlueprint);
  const [prevInitialBlueprint, setPrevInitialBlueprint] = React.useState(initialBlueprint);

  // Sync state if initialBlueprint changes (React recommended pattern without effect)
  if (initialBlueprint !== prevInitialBlueprint) {
    setPrevInitialBlueprint(initialBlueprint);
    setBlueprint(initialBlueprint);
  }

  const [selectedSections, setSelectedSections] = React.useState({
    budget: true,
    tasks: true,
    vendors: true,
    theme: true,
    risks: true,
  });
  const [isPersisting, setIsPersisting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Modal States
  const [editingOverview, setEditingOverview] = React.useState(false);
  const [overviewForm, setOverviewForm] = React.useState({
    title: blueprint.overview.title,
    description: blueprint.overview.description,
  });

  const [budgetModal, setBudgetModal] = React.useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    index?: number;
    data: BudgetAllocationBlueprint;
  }>({
    isOpen: false,
    mode: "add",
    data: {
      category: "",
      percentage: 0,
      suggestedAmount: 0,
      rationale: "",
    },
  });

  const [taskModal, setTaskModal] = React.useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    index?: number;
    data: TaskBlueprint;
  }>({
    isOpen: false,
    mode: "add",
    data: {
      title: "",
      description: "",
      relativeDaysBeforeEvent: 30,
      priority: "medium",
      category: "Planning",
      dependsOnTitles: [],
      estimatedDurationHours: 2.0,
    },
  });

  const [themeModal, setThemeModal] = React.useState<{
    isOpen: boolean;
    data: ThemeBlueprint;
  }>({
    isOpen: false,
    data: blueprint.theme,
  });

  const [colorModal, setColorModal] = React.useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    index?: number;
    data: { name: string; hex: string };
  }>({
    isOpen: false,
    mode: "add",
    data: { name: "", hex: "#4F46E5" },
  });

  const [riskModal, setRiskModal] = React.useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    index?: number;
    data: ContingencyBlueprint;
  }>({
    isOpen: false,
    mode: "add",
    data: {
      riskTitle: "",
      impact: "medium",
      probability: "medium",
      contingencyPlan: "",
    },
  });

  // Close any open modal on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (editingOverview) setEditingOverview(false);
        if (budgetModal.isOpen) setBudgetModal((prev) => ({ ...prev, isOpen: false }));
        if (taskModal.isOpen) setTaskModal((prev) => ({ ...prev, isOpen: false }));
        if (themeModal.isOpen) setThemeModal((prev) => ({ ...prev, isOpen: false }));
        if (colorModal.isOpen) setColorModal((prev) => ({ ...prev, isOpen: false }));
        if (riskModal.isOpen) setRiskModal((prev) => ({ ...prev, isOpen: false }));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingOverview, budgetModal.isOpen, taskModal.isOpen, themeModal.isOpen, colorModal.isOpen, riskModal.isOpen]);

  const toggleSection = (section: keyof typeof selectedSections) => {
    setSelectedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleResetToAIDraft = () => {
    setBlueprint(initialBlueprint);
  };

  // --- Handlers: Budget ---
  const totalTargetBudget = Number(input.totalBudget || 0);
  const totalAllocated = blueprint.budgetAllocations.reduce(
    (sum, b) => sum + Number(b.suggestedAmount || 0),
    0
  );
  const totalAllocatedPercent =
    totalTargetBudget > 0 ? Math.round((totalAllocated / totalTargetBudget) * 100) : 0;
  const isBudgetOver = totalTargetBudget > 0 && totalAllocated > totalTargetBudget;
  const overAmount = Math.max(0, totalAllocated - totalTargetBudget);
  const isSaveBlockedByBudget = selectedSections.budget && isBudgetOver;

  const handlePersist = async () => {
    if (isSaveBlockedByBudget) {
      setError(
        `Cannot save blueprint: Total budget allocations (₹${totalAllocated.toLocaleString()}) exceed target budget of ₹${totalTargetBudget.toLocaleString()} by ₹${overAmount.toLocaleString()} (${totalAllocatedPercent - 100}%). Please adjust category amounts to be within 100% before saving.`
      );
      return;
    }

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

  // --- Handlers: Overview ---
  const saveOverview = (e: React.FormEvent) => {
    e.preventDefault();
    setBlueprint((prev) => ({
      ...prev,
      overview: {
        ...prev.overview,
        title: overviewForm.title.trim() || prev.overview.title,
        description: overviewForm.description.trim() || prev.overview.description,
      },
    }));
    setEditingOverview(false);
  };

  const openAddBudgetModal = () => {
    setBudgetModal({
      isOpen: true,
      mode: "add",
      data: {
        category: "",
        percentage: 10,
        suggestedAmount: Math.round(totalTargetBudget * 0.1),
        rationale: "",
      },
    });
  };

  const openEditBudgetModal = (index: number) => {
    setBudgetModal({
      isOpen: true,
      mode: "edit",
      index,
      data: { ...blueprint.budgetAllocations[index] },
    });
  };

  const handleDeleteBudget = (index: number) => {
    setBlueprint((prev) => ({
      ...prev,
      budgetAllocations: prev.budgetAllocations.filter((_, i) => i !== index),
    }));
  };

  const saveBudgetCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(budgetModal.data.suggestedAmount || 0);
    const calculatedPercentage =
      totalTargetBudget > 0 ? Math.round((amount / totalTargetBudget) * 100) : 0;

    const updatedCategory: BudgetAllocationBlueprint = {
      ...budgetModal.data,
      suggestedAmount: amount,
      percentage: calculatedPercentage,
    };

    setBlueprint((prev) => {
      let updated: BudgetAllocationBlueprint[];
      if (budgetModal.mode === "add") {
        updated = [...prev.budgetAllocations, updatedCategory];
      } else if (budgetModal.index !== undefined) {
        updated = prev.budgetAllocations.map((item, idx) =>
          idx === budgetModal.index ? updatedCategory : item
        );
      } else {
        updated = prev.budgetAllocations;
      }
      return { ...prev, budgetAllocations: updated };
    });

    setBudgetModal((prev) => ({ ...prev, isOpen: false }));
  };

  // --- Handlers: Tasks ---
  const openAddTaskModal = () => {
    setTaskModal({
      isOpen: true,
      mode: "add",
      data: {
        title: "",
        description: "",
        relativeDaysBeforeEvent: 30,
        priority: "medium",
        category: "Planning",
        dependsOnTitles: [],
        estimatedDurationHours: 2.0,
      },
    });
  };

  const openEditTaskModal = (index: number) => {
    const task = blueprint.tasks[index];
    setTaskModal({
      isOpen: true,
      mode: "edit",
      index,
      data: {
        ...task,
        estimatedDurationHours: task.estimatedDurationHours ?? 2.0,
      },
    });
  };

  const handleDeleteTask = (index: number) => {
    setBlueprint((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const saveTask = (e: React.FormEvent) => {
    e.preventDefault();
    setBlueprint((prev) => {
      let updated: TaskBlueprint[];
      if (taskModal.mode === "add") {
        updated = [...prev.tasks, taskModal.data];
      } else if (taskModal.index !== undefined) {
        updated = prev.tasks.map((item, idx) =>
          idx === taskModal.index ? taskModal.data : item
        );
      } else {
        updated = prev.tasks;
      }
      return { ...prev, tasks: updated };
    });
    setTaskModal((prev) => ({ ...prev, isOpen: false }));
  };

  // --- Handlers: Theme ---
  const openEditThemeModal = () => {
    setThemeModal({
      isOpen: true,
      data: { ...blueprint.theme },
    });
  };

  const saveTheme = (e: React.FormEvent) => {
    e.preventDefault();
    setBlueprint((prev) => ({
      ...prev,
      theme: { ...themeModal.data },
    }));
    setThemeModal((prev) => ({ ...prev, isOpen: false }));
  };

  const openAddColorModal = () => {
    setColorModal({
      isOpen: true,
      mode: "add",
      data: { name: "", hex: "#2563EB" },
    });
  };

  const openEditColorModal = (index: number) => {
    setColorModal({
      isOpen: true,
      mode: "edit",
      index,
      data: { ...blueprint.theme.palette[index] },
    });
  };

  const handleDeleteColor = (index: number) => {
    setBlueprint((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        palette: prev.theme.palette.filter((_, i) => i !== index),
      },
    }));
  };

  const saveColor = (e: React.FormEvent) => {
    e.preventDefault();
    setBlueprint((prev) => {
      let updatedPalette = [...prev.theme.palette];
      if (colorModal.mode === "add") {
        updatedPalette.push(colorModal.data);
      } else if (colorModal.index !== undefined) {
        updatedPalette = updatedPalette.map((item, idx) =>
          idx === colorModal.index ? colorModal.data : item
        );
      }
      return {
        ...prev,
        theme: {
          ...prev.theme,
          palette: updatedPalette,
        },
      };
    });
    setColorModal((prev) => ({ ...prev, isOpen: false }));
  };

  // --- Handlers: Risks ---
  const openAddRiskModal = () => {
    setRiskModal({
      isOpen: true,
      mode: "add",
      data: {
        riskTitle: "",
        impact: "medium",
        probability: "medium",
        contingencyPlan: "",
      },
    });
  };

  const openEditRiskModal = (index: number) => {
    setRiskModal({
      isOpen: true,
      mode: "edit",
      index,
      data: { ...blueprint.contingencies[index] },
    });
  };

  const handleDeleteRisk = (index: number) => {
    setBlueprint((prev) => ({
      ...prev,
      contingencies: prev.contingencies.filter((_, i) => i !== index),
    }));
  };

  const saveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    setBlueprint((prev) => {
      let updated: ContingencyBlueprint[];
      if (riskModal.mode === "add") {
        updated = [...prev.contingencies, riskModal.data];
      } else if (riskModal.index !== undefined) {
        updated = prev.contingencies.map((item, idx) =>
          idx === riskModal.index ? riskModal.data : item
        );
      } else {
        updated = prev.contingencies;
      }
      return { ...prev, contingencies: updated };
    });
    setRiskModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Banner & Overview */}
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
                onClick={() => {
                  setOverviewForm({
                    title: blueprint.overview.title,
                    description: blueprint.overview.description,
                  });
                  setEditingOverview(true);
                }}
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
              onClick={handleResetToAIDraft}
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
              disabled={isPersisting || isSaveBlockedByBudget}
              className={cn(
                "gap-1.5 text-xs shadow-sm transition-all",
                isSaveBlockedByBudget && "opacity-60 cursor-not-allowed"
              )}
              title={
                isSaveBlockedByBudget
                  ? `Allocations exceed budget by ₹${overAmount.toLocaleString()} (${totalAllocatedPercent - 100}%). Reduce amounts to proceed.`
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
            Customize, add, or remove items in each module before saving
          </span>
        </div>

        {/* 1. Budget Categories */}
        <Card
          className={cn(
            "transition-all",
            isBudgetOver && selectedSections.budget
              ? "border-destructive/60 bg-destructive/5"
              : selectedSections.budget
              ? "border-primary/50"
              : "opacity-60 border-border"
          )}
        >
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-budget"
                checked={selectedSections.budget}
                onChange={() => toggleSection("budget")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  Budget Categories ({blueprint.budgetAllocations.length})
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
                    Allocates {totalAllocatedPercent}% (₹${totalAllocated.toLocaleString()}) of the {input.currency} {totalTargetBudget.toLocaleString()} target
                    {isBudgetOver && (
                      <span className="font-bold ml-1">
                        — Exceeds target by ₹${overAmount.toLocaleString()} ({totalAllocatedPercent - 100}%)
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
                onClick={openAddBudgetModal}
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Category
              </Button>
              {isBudgetOver && selectedSections.budget && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  Exceeds 100%
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {selectedSections.budget ? "Accepted" : "Excluded"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isBudgetOver && selectedSections.budget && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 mb-3.5 flex items-start gap-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold">Budget allocations exceed 100% target:</span>
                  <p className="text-[11px] leading-relaxed">
                    Total allocated is ₹${totalAllocated.toLocaleString()} ({totalAllocatedPercent}%), which exceeds the {input.currency} {totalTargetBudget.toLocaleString()} target by ₹${overAmount.toLocaleString()}. You must reduce or remove category allocations to 100% or less before you can save and proceed.
                  </p>
                </div>
              </div>
            )}
            {blueprint.budgetAllocations.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                No budget categories defined. Click &ldquo;Add Category&rdquo; to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {blueprint.budgetAllocations.map((cat, i) => (
                  <div key={i} className="group relative p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1.5 hover:border-primary/40 transition-colors">
                    <div className="flex justify-between items-start font-medium gap-2">
                      <span className="text-foreground font-semibold line-clamp-1">{cat.category}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditBudgetModal(i)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                          title="Edit category"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(i)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background/80 transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-primary font-semibold text-xs">
                      ₹{cat.suggestedAmount.toLocaleString()} ({cat.percentage}%)
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

        {/* 2. Tasks & Milestones */}
        <Card className={`transition-all ${selectedSections.tasks ? "border-primary/50" : "opacity-60 border-border"}`}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-tasks"
                checked={selectedSections.tasks}
                onChange={() => toggleSection("tasks")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
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
            <div className="flex items-center gap-2">
              {blueprint.tasks.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-normal">
                  <Clock className="w-3 h-3" />
                  {blueprint.tasks.reduce((sum, t) => sum + (Number(t.estimatedDurationHours) || 2), 0)} hrs total
                </Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddTaskModal}
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
              <Badge variant="secondary" className="text-xs">
                {selectedSections.tasks ? "Accepted" : "Excluded"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {blueprint.tasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                No milestone tasks defined. Click &ldquo;Add Task&rdquo; to create one.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {blueprint.tasks.map((t, i) => (
                  <div key={i} className="p-3 rounded-md bg-secondary/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-primary/30 transition-colors">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{t.title}</span>
                        <Badge
                          variant={
                            t.priority === "critical" || t.priority === "high"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-[9px] uppercase px-1.5 py-0"
                        >
                          {t.priority}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>
                      {t.dependsOnTitles.length > 0 && (
                        <p className="text-[10px] text-primary">
                          Depends on: {t.dependsOnTitles.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]" title="Auto-recommended process time">
                        <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {t.estimatedDurationHours ?? 2} {Number(t.estimatedDurationHours ?? 2) === 1 ? "hr" : "hrs"}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        T-{t.relativeDaysBeforeEvent} days
                      </span>
                      <div className="flex items-center gap-1 border-l border-border/60 pl-2">
                        <button
                          type="button"
                          onClick={() => openEditTaskModal(i)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                          title="Edit task"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(i)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background/80 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Theme & Aesthetic */}
        <Card className={`transition-all ${selectedSections.theme ? "border-primary/50" : "opacity-60 border-border"}`}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-theme"
                checked={selectedSections.theme}
                onChange={() => toggleSection("theme")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openEditThemeModal}
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Pencil className="h-3 w-3" />
                Edit Theme
              </Button>
              <Badge variant="secondary" className="text-xs">
                {selectedSections.theme ? "Accepted" : "Excluded"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Color Palette Row with Add/Edit/Delete */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium">Palette Swatches:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openAddColorModal}
                  className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3" />
                  Add Color
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {blueprint.theme.palette.map((swatch, i) => (
                  <div
                    key={i}
                    className="group relative flex items-center gap-1.5 p-1.5 rounded border border-border bg-card shadow-xs"
                  >
                    <button
                      type="button"
                      aria-label={`Edit ${swatch.name} swatch`}
                      className="h-5 w-5 rounded-sm border border-black/10 shrink-0 cursor-pointer p-0"
                      style={{ backgroundColor: swatch.hex }}
                      onClick={() => openEditColorModal(i)}
                      title="Click to edit color"
                    />
                    <span className="text-[10px] text-foreground font-medium pr-1">
                      {swatch.name}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEditColorModal(i)}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                        title="Edit color"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteColor(i)}
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                        title="Delete color"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
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
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-risks"
                checked={selectedSections.risks}
                onChange={() => toggleSection("risks")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddRiskModal}
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Safeguard
              </Button>
              <Badge variant="secondary" className="text-xs">
                {selectedSections.risks ? "Accepted" : "Excluded"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {blueprint.contingencies.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                No contingencies defined. Click &ldquo;Add Safeguard&rdquo; to add one.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {blueprint.contingencies.map((c, i) => (
                  <div key={i} className="p-3 rounded-md bg-secondary/40 border border-border/50 space-y-1 hover:border-primary/30 transition-colors">
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
                          onClick={() => openEditRiskModal(i)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                          title="Edit risk"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRisk(i)}
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
      </div>

      {/* Bottom Save Action Bar */}
      <div className="sticky bottom-4 z-30 p-4 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-lg flex items-center justify-between">
        <div className="text-xs max-w-md">
          {isSaveBlockedByBudget ? (
            <span className="text-destructive font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span>
                Cannot save: Budget allocations ({totalAllocatedPercent}%) exceed 100%. Reduce category amounts by ₹${overAmount.toLocaleString()} to proceed.
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Ready to save tailored blueprint into your isolated workspace.
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onReset} disabled={isPersisting}>
            Regenerate
          </Button>
          <Button
            size="sm"
            onClick={handlePersist}
            disabled={isPersisting || isSaveBlockedByBudget}
            className={cn(
              "gap-2 shadow-sm transition-all",
              isSaveBlockedByBudget && "opacity-60 cursor-not-allowed"
            )}
            title={
              isSaveBlockedByBudget
                ? `Allocations exceed budget by ₹${overAmount.toLocaleString()} (${totalAllocatedPercent - 100}%). Reduce amounts to proceed.`
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

      {/* --- MODAL 1: Overview Title & Description --- */}
      {editingOverview && (
        <div
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingOverview(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="overview-modal-title"
            className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="overview-modal-title" className="font-serif text-lg font-semibold text-foreground">
                Edit Event Blueprint Overview
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setEditingOverview(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={saveOverview} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="ov-title" className="text-xs">Event Blueprint Title</Label>
                <Input
                  id="ov-title"
                  value={overviewForm.title}
                  onChange={(e) => setOverviewForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-desc" className="text-xs">Concept Description</Label>
                <Textarea
                  id="ov-desc"
                  rows={4}
                  value={overviewForm.description}
                  onChange={(e) => setOverviewForm((prev) => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingOverview(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Budget Category Modal --- */}
      {budgetModal.isOpen && (
        <div
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setBudgetModal((prev) => ({ ...prev, isOpen: false })); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-modal-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="budget-modal-title" className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" aria-hidden="true" />
                {budgetModal.mode === "add" ? "Add Budget Category" : "Edit Budget Category"}
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setBudgetModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={saveBudgetCategory} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="bg-cat" className="text-xs">Category Name</Label>
                <Input
                  id="bg-cat"
                  placeholder="e.g. Photography & Drone Video"
                  value={budgetModal.data.category}
                  onChange={(e) =>
                    setBudgetModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, category: e.target.value },
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bg-amount" className="text-xs">
                  Allocated Amount ({input.currency || "INR"})
                </Label>
                <Input
                  id="bg-amount"
                  type="number"
                  min="0"
                  step="50"
                  value={budgetModal.data.suggestedAmount || ""}
                  onChange={(e) =>
                    setBudgetModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, suggestedAmount: Number(e.target.value) },
                    }))
                  }
                  required
                />
                {totalTargetBudget > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Represents approx{" "}
                    {Math.round(((budgetModal.data.suggestedAmount || 0) / totalTargetBudget) * 100)}% of total target
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bg-rationale" className="text-xs">Rationale & Scope</Label>
                <Textarea
                  id="bg-rationale"
                  rows={3}
                  placeholder="Scope of vendor deliverables or cost assumptions..."
                  value={budgetModal.data.rationale}
                  onChange={(e) =>
                    setBudgetModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, rationale: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBudgetModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {budgetModal.mode === "add" ? "Add to Blueprint" : "Update Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Task Modal --- */}
      {taskModal.isOpen && (
        <div
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setTaskModal((prev) => ({ ...prev, isOpen: false })); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="task-modal-title" className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                {taskModal.mode === "add" ? "Add Milestone Task" : "Edit Milestone Task"}
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setTaskModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={saveTask} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="tsk-title" className="text-xs">Task Title</Label>
                <Input
                  id="tsk-title"
                  placeholder="e.g. Schedule Cake Tasting Session"
                  value={taskModal.data.title}
                  onChange={(e) =>
                    setTaskModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, title: e.target.value },
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tsk-desc" className="text-xs">Description & Deliverables</Label>
                <Textarea
                  id="tsk-desc"
                  rows={2}
                  placeholder="Details on what needs to be verified..."
                  value={taskModal.data.description}
                  onChange={(e) =>
                    setTaskModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, description: e.target.value },
                    }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tsk-priority" className="text-xs">Priority</Label>
                  <select
                    id="tsk-priority"
                    value={taskModal.data.priority}
                    onChange={(e) => {
                      const newPriority = e.target.value as TaskBlueprint["priority"];
                      const recHours = recommendProcessHours(newPriority, taskModal.data.category, taskModal.data.title);
                      setTaskModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          priority: newPriority,
                          estimatedDurationHours: recHours,
                        },
                      }));
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tsk-days" className="text-xs">Days Before (T-X)</Label>
                  <Input
                    id="tsk-days"
                    type="number"
                    min="0"
                    max="730"
                    value={taskModal.data.relativeDaysBeforeEvent}
                    onChange={(e) =>
                      setTaskModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, relativeDaysBeforeEvent: Number(e.target.value) },
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tsk-duration" className="text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      Process Hours
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        const rec = recommendProcessHours(taskModal.data.priority, taskModal.data.category, taskModal.data.title);
                        setTaskModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, estimatedDurationHours: rec },
                        }));
                      }}
                      className="text-[10px] text-primary hover:underline cursor-pointer"
                      title="Auto recommend based on task details and priority"
                    >
                      Auto
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="tsk-duration"
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="100"
                      value={taskModal.data.estimatedDurationHours ?? 2}
                      onChange={(e) =>
                        setTaskModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, estimatedDurationHours: Number(e.target.value) || 0.5 },
                        }))
                      }
                      className="pr-8"
                      required
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                      hrs
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTaskModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {taskModal.mode === "add" ? "Add Task" : "Update Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Theme Details Modal --- */}
      {themeModal.isOpen && (
        <div
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setThemeModal((prev) => ({ ...prev, isOpen: false })); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-modal-title"
            className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="theme-modal-title" className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
                Edit Theme & Styling Direction
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setThemeModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={saveTheme} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="thm-name" className="text-xs">Theme Name</Label>
                <Input
                  id="thm-name"
                  value={themeModal.data.themeName}
                  onChange={(e) =>
                    setThemeModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, themeName: e.target.value },
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="thm-concept" className="text-xs">Concept Description</Label>
                <Textarea
                  id="thm-concept"
                  rows={3}
                  value={themeModal.data.conceptDescription}
                  onChange={(e) =>
                    setThemeModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, conceptDescription: e.target.value },
                    }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="thm-decor" className="text-xs">Decor Direction</Label>
                  <Input
                    id="thm-decor"
                    value={themeModal.data.decorDirection}
                    onChange={(e) =>
                      setThemeModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, decorDirection: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="thm-lighting" className="text-xs">Lighting Direction</Label>
                  <Input
                    id="thm-lighting"
                    value={themeModal.data.lightingDirection}
                    onChange={(e) =>
                      setThemeModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, lightingDirection: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="thm-invites" className="text-xs">Stationery</Label>
                  <Input
                    id="thm-invites"
                    value={themeModal.data.invitationDirection}
                    onChange={(e) =>
                      setThemeModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, invitationDirection: e.target.value },
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
                  onClick={() => setThemeModal((prev) => ({ ...prev, isOpen: false }))}
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
      )}

      {/* --- MODAL 5: Color Swatch Modal --- */}
      {colorModal.isOpen && (
        <div
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setColorModal((prev) => ({ ...prev, isOpen: false })); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="color-modal-title"
            className="relative w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 id="color-modal-title" className="font-serif text-base font-semibold text-foreground">
                {colorModal.mode === "add" ? "Add Color Swatch" : "Edit Color Swatch"}
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setColorModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={saveColor} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="col-name" className="text-xs">Color Name</Label>
                <Input
                  id="col-name"
                  placeholder="e.g. Sage Green"
                  value={colorModal.data.name}
                  onChange={(e) =>
                    setColorModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, name: e.target.value },
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="col-hex" className="text-xs">Hex Color Code</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="col-picker"
                    value={colorModal.data.hex}
                    onChange={(e) =>
                      setColorModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, hex: e.target.value },
                      }))
                    }
                    className="h-8 w-10 p-0 border border-border rounded cursor-pointer bg-transparent"
                  />
                  <Input
                    id="col-hex"
                    value={colorModal.data.hex}
                    onChange={(e) =>
                      setColorModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, hex: e.target.value },
                      }))
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
                  onClick={() => setColorModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {colorModal.mode === "add" ? "Add Swatch" : "Save Color"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 6: Risk / Contingency Modal --- */}
      {riskModal.isOpen && (
        <div
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setRiskModal((prev) => ({ ...prev, isOpen: false })); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="risk-modal-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="risk-modal-title" className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
                {riskModal.mode === "add" ? "Add Contingency Safeguard" : "Edit Safeguard"}
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setRiskModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={saveRisk} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="rsk-title" className="text-xs">Risk Title</Label>
                <Input
                  id="rsk-title"
                  placeholder="e.g. Inclement Weather / Rain Plan"
                  value={riskModal.data.riskTitle}
                  onChange={(e) =>
                    setRiskModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, riskTitle: e.target.value },
                    }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rsk-impact" className="text-xs">Impact</Label>
                  <select
                    id="rsk-impact"
                    value={riskModal.data.impact}
                    onChange={(e) =>
                      setRiskModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          impact: e.target.value as ContingencyBlueprint["impact"],
                        },
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
                  <Label htmlFor="rsk-prob" className="text-xs">Probability</Label>
                  <select
                    id="rsk-prob"
                    value={riskModal.data.probability}
                    onChange={(e) =>
                      setRiskModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          probability: e.target.value as ContingencyBlueprint["probability"],
                        },
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
                <Label htmlFor="rsk-plan" className="text-xs">Contingency & Mitigation Plan</Label>
                <Textarea
                  id="rsk-plan"
                  rows={3}
                  placeholder="Concrete steps or backup vendors ready to deploy..."
                  value={riskModal.data.contingencyPlan}
                  onChange={(e) =>
                    setRiskModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, contingencyPlan: e.target.value },
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
                  onClick={() => setRiskModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {riskModal.mode === "add" ? "Add Safeguard" : "Update Safeguard"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
