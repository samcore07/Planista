import { describe, it, expect } from "vitest";
import { DeterministicBlueprintEngine } from "../provider";
import { eventBlueprintSchema } from "@/types/blueprint.types";

describe("AI Event Architect", () => {
  it("generates a complete, Zod-validated blueprint from natural language inputs", () => {
    const input = {
      eventType: "Wedding",
      title: "Elena & Marcus Autumn Celebration",
      guestCount: 150,
      totalBudget: 40000,
      currency: "USD",
      preferences: "Warm modern minimalist",
      dietaryOrAccessibility: "Vegetarian and gluten-free guests",
      constraints: "10 PM sound limit",
    };

    const blueprint = DeterministicBlueprintEngine.generate(input);
    const parsed = eventBlueprintSchema.safeParse(blueprint);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.overview.title).toBe("Elena & Marcus Autumn Celebration");
      expect(parsed.data.budgetAllocations.length).toBeGreaterThan(0);
      expect(parsed.data.tasks.length).toBeGreaterThan(0);
      expect(parsed.data.theme.palette.length).toBeGreaterThan(0);
      expect(parsed.data.contingencies.length).toBeGreaterThan(0);

      // Verify auto-recommended process hours are present on all generated tasks
      for (const task of parsed.data.tasks) {
        expect(task.estimatedDurationHours).toBeDefined();
        expect(typeof task.estimatedDurationHours).toBe("number");
        expect(task.estimatedDurationHours).toBeGreaterThan(0);
      }
    }
  });

  it("includes explicit assumptions and uncertainties in overview", () => {
    const input = {
      eventType: "Community Fundraiser",
      guestCount: 200,
      totalBudget: 15000,
      currency: "USD",
    };

    const blueprint = DeterministicBlueprintEngine.generate(input);
    expect(blueprint.overview.assumptions.length).toBeGreaterThan(0);
    expect(blueprint.overview.uncertainties.length).toBeGreaterThan(0);
  });

  it("never states that a vendor is available or quote is verified", () => {
    const input = {
      eventType: "Corporate Gala",
      guestCount: 80,
      totalBudget: 20000,
      currency: "USD",
    };

    const blueprint = DeterministicBlueprintEngine.generate(input);
    for (const vendor of blueprint.vendorRequirements) {
      const lowerNotes = vendor.notes.toLowerCase();
      expect(lowerNotes).toContain("must be");
      expect(lowerNotes).not.toContain("quote verified");
      expect(lowerNotes).not.toContain("vendor confirmed");
    }
  });

  it("strictly rejects malformed blueprint structures missing mandatory arrays", () => {
    const malformed = {
      overview: {
        title: "Broken",
        eventType: "Broken",
        description: "Broken",
        suggestedTimelineMonths: 1,
        keyThemeSummary: "None",
      },
      budgetAllocations: [], // Violates .min(1)
      tasks: [], // Violates .min(1)
    };

    const result = eventBlueprintSchema.safeParse(malformed);
    expect(result.success).toBe(false);
  });
});
