import { z } from "zod";

export const eventOverviewBlueprintSchema = z.object({
  title: z.string().min(3),
  eventType: z.string().min(2),
  description: z.string(),
  suggestedTimelineMonths: z.number().int().positive(),
  keyThemeSummary: z.string(),
  assumptions: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
});

export const budgetAllocationBlueprintSchema = z.object({
  category: z.string(),
  percentage: z.number().min(0).max(100),
  suggestedAmount: z.number().nonnegative(),
  rationale: z.string(),
});

export const taskBlueprintSchema = z.object({
  title: z.string(),
  description: z.string(),
  relativeDaysBeforeEvent: z.number().int(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  category: z.string(),
  dependsOnTitles: z.array(z.string()).default([]),
  estimatedDurationHours: z.number().positive().optional().default(2),
});

/**
 * Auto-recommends realistic process time (in hours) based on priority, category, and task title.
 */
export function recommendProcessHours(
  priority: "low" | "medium" | "high" | "critical" = "medium",
  category?: string,
  title?: string
): number {
  const lowerTitle = (title || "").toLowerCase();
  const lowerCat = (category || "").toLowerCase();

  // Scope & Discipline specific duration heuristics
  if (lowerTitle.includes("contract") || lowerTitle.includes("venue") || lowerCat.includes("venue")) {
    return 4.0;
  }
  if (lowerTitle.includes("tasting") || lowerTitle.includes("menu") || lowerCat.includes("catering") || lowerCat.includes("bar")) {
    return 3.0;
  }
  if (
    lowerTitle.includes("run-sheet") ||
    lowerTitle.includes("run of show") ||
    lowerTitle.includes("coordination") ||
    lowerTitle.includes("delivery schedule") ||
    lowerCat.includes("operations")
  ) {
    return 3.5;
  }
  if (lowerTitle.includes("decor") || lowerTitle.includes("lighting") || lowerTitle.includes("floral") || lowerCat.includes("decor")) {
    return 2.5;
  }
  if (lowerTitle.includes("headcount") || lowerTitle.includes("seating") || lowerTitle.includes("rsvp") || lowerCat.includes("guest")) {
    return 2.0;
  }
  if (lowerTitle.includes("budget") || lowerTitle.includes("finance") || lowerTitle.includes("payment")) {
    return 2.0;
  }

  // Priority-based baseline
  switch (priority) {
    case "critical":
      return 3.5;
    case "high":
      return 2.5;
    case "medium":
      return 2.0;
    case "low":
      return 1.0;
    default:
      return 2.0;
  }
}

export const vendorRequirementBlueprintSchema = z.object({
  category: z.string(),
  nameRecommendation: z.string(), // Clearly noted as generic archetype or suggested vendor type
  estimatedCostRange: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
  deliverables: z.array(z.string()),
  notes: z.string(),
});

export const themeBlueprintSchema = z.object({
  themeName: z.string(),
  conceptDescription: z.string(),
  palette: z.array(
    z.object({
      name: z.string(),
      hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    })
  ),
  decorDirection: z.string(),
  lightingDirection: z.string(),
  floralDirection: z.string().optional(),
  invitationDirection: z.string(),
});

export const contingencyBlueprintSchema = z.object({
  riskTitle: z.string(),
  probability: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  contingencyPlan: z.string(),
});

export const eventBlueprintSchema = z.object({
  overview: eventOverviewBlueprintSchema,
  budgetAllocations: z.array(budgetAllocationBlueprintSchema).min(1),
  tasks: z.array(taskBlueprintSchema).min(1),
  vendorRequirements: z.array(vendorRequirementBlueprintSchema),
  theme: themeBlueprintSchema,
  contingencies: z.array(contingencyBlueprintSchema),
});

export type EventBlueprint = z.infer<typeof eventBlueprintSchema>;
export type TaskBlueprint = z.infer<typeof taskBlueprintSchema>;
export type BudgetAllocationBlueprint = z.infer<typeof budgetAllocationBlueprintSchema>;
export type VendorRequirementBlueprint = z.infer<typeof vendorRequirementBlueprintSchema>;
export type ThemeBlueprint = z.infer<typeof themeBlueprintSchema>;
export type ContingencyBlueprint = z.infer<typeof contingencyBlueprintSchema>;
