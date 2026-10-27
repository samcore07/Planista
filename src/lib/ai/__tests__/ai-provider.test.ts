import { describe, it, expect } from "vitest";
import { DeterministicBlueprintEngine, PlanistaAIProvider } from "../provider";
import { eventBlueprintSchema } from "@/types/blueprint.types";

describe("AI Provider & Deterministic Blueprint Engine", () => {
  it("generates a structured blueprint that strictly satisfies eventBlueprintSchema", () => {
    const blueprint = DeterministicBlueprintEngine.generate({
      eventType: "Wedding",
      title: "Clara & Samuel Wedding",
      guestCount: 150,
      totalBudget: 45000,
      currency: "USD",
      dietaryOrAccessibility: "Vegetarian and wheelchair accessibility required",
      preferences: "Modern Botanical",
    });

    const validation = eventBlueprintSchema.safeParse(blueprint);
    expect(validation.success).toBe(true);

    if (validation.success) {
      expect(blueprint.overview.title).toBe("Clara & Samuel Wedding");
      expect(blueprint.overview.eventType).toBe("Wedding");
      expect(blueprint.budgetAllocations.length).toBeGreaterThan(3);
      expect(blueprint.tasks.length).toBeGreaterThan(3);
      expect(blueprint.theme.palette.length).toBeGreaterThan(2);

      // Verify budget percentages sum to 100%
      const totalPercent = blueprint.budgetAllocations.reduce((sum, a) => sum + a.percentage, 0);
      expect(totalPercent).toBe(100);
    }
  });

  it("handles copilot reduction requests with validated proposed actions", async () => {
    const provider = new PlanistaAIProvider();
    const action = await provider.proposeCopilotAction({}, "Reduce my budget by $5,000 for floral");

    expect(action.actionType).toBe("adjust_budget");
    expect(action.financialImpact?.amountDelta).toBe(-5000);
    expect(action.tradeOffs.length).toBeGreaterThan(0);
  });

  it("handles copilot rescheduling requests with validated proposed actions", async () => {
    const provider = new PlanistaAIProvider();
    const action = await provider.proposeCopilotAction({}, "Reschedule tasks due to late photographer");

    expect(action.actionType).toBe("reschedule_task");
    expect(action.tradeOffs.length).toBeGreaterThan(0);
  });
});
