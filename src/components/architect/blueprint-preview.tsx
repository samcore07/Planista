/**
 * @fileoverview Interactive Blueprint Preview and Staging Editor.
 * Orchestrates synthesized event blueprints, category budgets, milestone tasks,
 * and allows real-time pre-database editing before atomic persistence.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  EventBlueprint,
  BudgetAllocationBlueprint,
  TaskBlueprint,
  ContingencyBlueprint,
  ThemeBlueprint,
} from "@/types/blueprint.types";
import { BlueprintGenerationInput } from "@/lib/ai/provider";
import { persistAcceptedBlueprintAction } from "@/app/events/architect/actions";
import {
  BlueprintBanner,
  BlueprintBudgetSection,
  BlueprintTasksSection,
  BlueprintThemeSection,
  BlueprintRisksSection,
  BlueprintActionBar,
  OverviewModal,
  BudgetModal,
  TaskModal,
  ThemeModal,
  ColorModal,
  RiskModal,
} from "./preview";
import { Store } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BlueprintPreviewProps {
  blueprint: EventBlueprint;
  input: BlueprintGenerationInput;
  onReset: () => void;
}

export function BlueprintPreview({
  blueprint: initialBlueprint,
  input,
  onReset,
}: BlueprintPreviewProps) {
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
  }, [
    editingOverview,
    budgetModal.isOpen,
    taskModal.isOpen,
    themeModal.isOpen,
    colorModal.isOpen,
    riskModal.isOpen,
  ]);

  const toggleSection = (section: keyof typeof selectedSections) => {
    setSelectedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleResetToAIDraft = () => {
    setBlueprint(initialBlueprint);
  };

  // --- Financial Calculations & Validation ---
  const currency = input.currency || "INR";
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

  // --- Handlers: Persist ---
  const isPersistingRef = React.useRef(false);

  const handlePersist = async () => {
    // Prevent duplicate submissions while an operation is already in-flight
    if (isPersistingRef.current || isPersisting) {
      return;
    }

    if (isSaveBlockedByBudget) {
      setError(
        `Cannot save blueprint: Total budget allocations exceed target budget of ${currency} ${totalTargetBudget.toLocaleString()} by ${currency} ${overAmount.toLocaleString()} (${totalAllocatedPercent - 100}%). Please adjust category amounts to be within 100% before saving.`
      );
      return;
    }

    isPersistingRef.current = true;
    setIsPersisting(true);
    setError(null);

    try {
      const result = await persistAcceptedBlueprintAction({
        input,
        blueprint,
        selectedSections,
      });

      if (!result.success || !result.eventId) {
        setError(result.error || "Failed to persist accepted blueprint sections");
        return;
      }

      router.push(`/events/${result.eventId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to persist accepted blueprint sections";
      setError(message);
    } finally {
      isPersistingRef.current = false;
      setIsPersisting(false);
    }
  };

  // --- Handlers: Overview ---
  const handleSaveOverview = (title: string, description: string) => {
    setBlueprint((prev) => ({
      ...prev,
      overview: {
        ...prev.overview,
        title: title.trim() || prev.overview.title,
        description: description.trim() || prev.overview.description,
      },
    }));
    setEditingOverview(false);
  };

  // --- Handlers: Budget ---
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

  const handleSaveBudgetCategory = (category: BudgetAllocationBlueprint) => {
    setBlueprint((prev) => {
      let updated: BudgetAllocationBlueprint[];
      if (budgetModal.mode === "add") {
        updated = [...prev.budgetAllocations, category];
      } else if (budgetModal.index !== undefined) {
        updated = prev.budgetAllocations.map((item, idx) =>
          idx === budgetModal.index ? category : item
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

  const handleSaveTask = (task: TaskBlueprint) => {
    setBlueprint((prev) => {
      let updated: TaskBlueprint[];
      if (taskModal.mode === "add") {
        updated = [...prev.tasks, task];
      } else if (taskModal.index !== undefined) {
        updated = prev.tasks.map((item, idx) =>
          idx === taskModal.index ? task : item
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

  const handleSaveTheme = (theme: ThemeBlueprint) => {
    setBlueprint((prev) => ({
      ...prev,
      theme,
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

  const handleSaveColor = (color: { name: string; hex: string }) => {
    setBlueprint((prev) => {
      let updatedPalette = [...prev.theme.palette];
      if (colorModal.mode === "add") {
        updatedPalette.push(color);
      } else if (colorModal.index !== undefined) {
        updatedPalette = updatedPalette.map((item, idx) =>
          idx === colorModal.index ? color : item
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

  const handleSaveRisk = (risk: ContingencyBlueprint) => {
    setBlueprint((prev) => {
      let updated: ContingencyBlueprint[];
      if (riskModal.mode === "add") {
        updated = [...prev.contingencies, risk];
      } else if (riskModal.index !== undefined) {
        updated = prev.contingencies.map((item, idx) =>
          idx === riskModal.index ? risk : item
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
      <BlueprintBanner
        blueprint={blueprint}
        currency={currency}
        isPersisting={isPersisting}
        isSaveBlockedByBudget={isSaveBlockedByBudget}
        overAmount={overAmount}
        totalAllocatedPercent={totalAllocatedPercent}
        onEditOverview={() => setEditingOverview(true)}
        onResetToAIDraft={handleResetToAIDraft}
        onAdjustAndRegenerate={onReset}
        onPersist={handlePersist}
      />

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
        <BlueprintBudgetSection
          categories={blueprint.budgetAllocations}
          currency={currency}
          totalTargetBudget={totalTargetBudget}
          totalAllocated={totalAllocated}
          totalAllocatedPercent={totalAllocatedPercent}
          isBudgetOver={isBudgetOver}
          overAmount={overAmount}
          isSelected={selectedSections.budget}
          onToggleSection={() => toggleSection("budget")}
          onOpenAddModal={openAddBudgetModal}
          onOpenEditModal={openEditBudgetModal}
          onDeleteCategory={handleDeleteBudget}
        />

        {/* 2. Tasks & Milestones */}
        <BlueprintTasksSection
          tasks={blueprint.tasks}
          isSelected={selectedSections.tasks}
          onToggleSection={() => toggleSection("tasks")}
          onOpenAddModal={openAddTaskModal}
          onOpenEditModal={openEditTaskModal}
          onDeleteTask={handleDeleteTask}
        />

        {/* 3. Recommended Vendors */}
        <Card
          className={`transition-all ${
            selectedSections.vendors ? "border-primary/50" : "opacity-60 border-border"
          }`}
        >
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-vendors"
                aria-label="Include vendor recommendations"
                checked={selectedSections.vendors}
                onChange={() => toggleSection("vendors")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  Recommended Vendors ({(blueprint.vendorRequirements || []).length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Suggested vendor archetypes and estimated cost ranges
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedSections.vendors ? "Accepted" : "Excluded"}
            </Badge>
          </CardHeader>
          <CardContent>
            {(!blueprint.vendorRequirements || blueprint.vendorRequirements.length === 0) ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                No vendor recommendations generated.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {blueprint.vendorRequirements.map((v, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-md bg-secondary/40 border border-border/50 space-y-1.5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{v.nameRecommendation}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {v.category}
                      </Badge>
                    </div>
                    {v.notes && <p className="text-muted-foreground text-[11px]">{v.notes}</p>}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                      <span className="text-muted-foreground">Estimated Range:</span>
                      <span className="font-semibold text-primary">
                        {currency} {Number(v.estimatedCostRange?.min || 0).toLocaleString()} &ndash; {currency} {Number(v.estimatedCostRange?.max || 0).toLocaleString()}
                      </span>
                    </div>
                    {v.deliverables && v.deliverables.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {v.deliverables.map((d, dIdx) => (
                          <span
                            key={dIdx}
                            className="bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded text-[10px] border border-border/40"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Theme & Aesthetic */}
        <BlueprintThemeSection
          theme={blueprint.theme}
          isSelected={selectedSections.theme}
          onToggleSection={() => toggleSection("theme")}
          onOpenEditThemeModal={openEditThemeModal}
          onOpenAddColorModal={openAddColorModal}
          onOpenEditColorModal={openEditColorModal}
          onDeleteColor={handleDeleteColor}
        />

        {/* 5. Contingencies & Risks */}
        <BlueprintRisksSection
          contingencies={blueprint.contingencies}
          isSelected={selectedSections.risks}
          onToggleSection={() => toggleSection("risks")}
          onOpenAddModal={openAddRiskModal}
          onOpenEditModal={openEditRiskModal}
          onDeleteRisk={handleDeleteRisk}
        />
      </div>

      {/* Bottom Save Action Bar */}
      <BlueprintActionBar
        currency={currency}
        isPersisting={isPersisting}
        isSaveBlockedByBudget={isSaveBlockedByBudget}
        overAmount={overAmount}
        totalAllocatedPercent={totalAllocatedPercent}
        onReset={onReset}
        onPersist={handlePersist}
      />

      {/* --- MODALS --- */}
      <OverviewModal
        isOpen={editingOverview}
        initialTitle={blueprint.overview.title}
        initialDescription={blueprint.overview.description}
        onClose={() => setEditingOverview(false)}
        onSave={handleSaveOverview}
      />

      <BudgetModal
        isOpen={budgetModal.isOpen}
        mode={budgetModal.mode}
        initialData={budgetModal.data}
        currency={currency}
        totalTargetBudget={totalTargetBudget}
        onClose={() => setBudgetModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveBudgetCategory}
      />

      <TaskModal
        isOpen={taskModal.isOpen}
        mode={taskModal.mode}
        initialData={taskModal.data}
        onClose={() => setTaskModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveTask}
      />

      <ThemeModal
        isOpen={themeModal.isOpen}
        initialData={themeModal.data}
        onClose={() => setThemeModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveTheme}
      />

      <ColorModal
        isOpen={colorModal.isOpen}
        mode={colorModal.mode}
        initialData={colorModal.data}
        onClose={() => setColorModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveColor}
      />

      <RiskModal
        isOpen={riskModal.isOpen}
        mode={riskModal.mode}
        initialData={riskModal.data}
        onClose={() => setRiskModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveRisk}
      />
    </div>
  );
}
