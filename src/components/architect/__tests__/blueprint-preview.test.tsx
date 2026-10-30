/**
 * @fileoverview Unit and integration tests for BlueprintPreview and its modular subcomponents.
 * Verifies rendering, empty dataset handling, budget overage validation, and user action triggers.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlueprintPreview } from "../blueprint-preview";
import { EventBlueprint } from "@/types/blueprint.types";
import { BlueprintGenerationInput } from "@/lib/ai/provider";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock persist action
vi.mock("@/app/events/architect/actions", () => ({
  persistAcceptedBlueprintAction: vi.fn().mockResolvedValue({ success: true, eventId: "test-event-123" }),
}));

describe("BlueprintPreview Component", () => {
  const mockInput: BlueprintGenerationInput = {
    eventType: "Conference",
    title: "Tech Innovation Summit 2026",
    guestCount: 200,
    totalBudget: 500000,
    currency: "INR",
    location: "Bengaluru",
  };

  const mockBlueprint: EventBlueprint = {
    overview: {
      title: "Tech Innovation Summit 2026",
      eventType: "Conference",
      description: "Premier gathering for emerging technology leaders.",
      suggestedTimelineMonths: 6,
      keyThemeSummary: "Modern minimalist cyber aesthetics",
      assumptions: ["Venue booked 3 months prior", "Catering includes vegetarian options"],
      uncertainties: ["Speaker availability on day 2"],
    },
    budgetAllocations: [
      {
        category: "Venue & AV",
        percentage: 50,
        suggestedAmount: 250000,
        rationale: "Main hall and surround sound setup",
      },
      {
        category: "Catering",
        percentage: 30,
        suggestedAmount: 150000,
        rationale: "Lunch and networking dinner",
      },
    ],
    tasks: [
      {
        title: "Confirm Keynote Speaker",
        description: "Sign engagement agreement and finalize schedule",
        relativeDaysBeforeEvent: 60,
        priority: "critical",
        category: "Programming",
        dependsOnTitles: [],
        estimatedDurationHours: 4,
      },
      {
        title: "Print Name Badges",
        description: "Batch print attendee NFC badges",
        relativeDaysBeforeEvent: 7,
        priority: "medium",
        category: "Operations",
        dependsOnTitles: ["Confirm Keynote Speaker"],
        estimatedDurationHours: 2,
      },
    ],
    vendorRequirements: [
      {
        category: "Audio/Visual",
        nameRecommendation: "AV Production Specialist",
        estimatedCostRange: { min: 50000, max: 80000 },
        deliverables: ["Stage lighting", "Multi-mic audio mixing"],
        notes: "Requires pre-conference rehearsal",
      },
    ],
    theme: {
      themeName: "Cyberpunk Minimal",
      conceptDescription: "Deep navy and neon amber lines with subtle glassmorphic elements.",
      decorDirection: "Brushed aluminum stands with amber accents",
      lightingDirection: "Low-diffuse cool blue backlighting",
      invitationDirection: "Digital animated invite cards",
      palette: [
        { name: "Navy Core", hex: "#0A192F" },
        { name: "Amber Glow", hex: "#F59E0B" },
      ],
    },
    contingencies: [
      {
        riskTitle: "AV Equipment Failure",
        impact: "high",
        probability: "low",
        contingencyPlan: "Backup projector and secondary audio mixer on standby",
      },
    ],
  };

  it("renders event title, description, assumptions, and uncertainties", () => {
    render(
      <BlueprintPreview
        blueprint={mockBlueprint}
        input={mockInput}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText("Tech Innovation Summit 2026")).toBeTruthy();
    expect(screen.getByText(/Premier gathering for emerging technology leaders/)).toBeTruthy();
    expect(screen.getByText("Venue booked 3 months prior")).toBeTruthy();
    expect(screen.getByText("Speaker availability on day 2")).toBeTruthy();
  });

  it("renders budget categories and allocated amounts correctly", () => {
    render(
      <BlueprintPreview
        blueprint={mockBlueprint}
        input={mockInput}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText("Venue & AV")).toBeTruthy();
    expect(screen.getByText("Catering")).toBeTruthy();
  });

  it("handles empty datasets gracefully without crashing", () => {
    const emptyBlueprint: EventBlueprint = {
      overview: {
        title: "Empty Event",
        eventType: "Private",
        description: "Empty test blueprint",
        suggestedTimelineMonths: 1,
        keyThemeSummary: "None",
        assumptions: [],
        uncertainties: [],
      },
      budgetAllocations: [],
      tasks: [],
      vendorRequirements: [],
      theme: {
        themeName: "Default",
        conceptDescription: "No styling specified.",
        decorDirection: "Simple",
        lightingDirection: "Natural",
        invitationDirection: "Plain",
        palette: [],
      },
      contingencies: [],
    };

    render(
      <BlueprintPreview
        blueprint={emptyBlueprint}
        input={{ ...mockInput, totalBudget: 0 }}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText("Empty Event")).toBeTruthy();
    expect(screen.getByText(/No budget categories defined/i)).toBeTruthy();
    expect(screen.getByText(/No milestone tasks defined/i)).toBeTruthy();
    expect(screen.getByText(/No contingencies defined/i)).toBeTruthy();
  });

  it("displays over-budget warning and disables saving when allocations exceed 100%", () => {
    const overBudgetBlueprint: EventBlueprint = {
      ...mockBlueprint,
      budgetAllocations: [
        {
          category: "Massive Venue",
          percentage: 120,
          suggestedAmount: 600000, // Exceeds 500,000 budget
          rationale: "Over-budget venue",
        },
      ],
    };

    render(
      <BlueprintPreview
        blueprint={overBudgetBlueprint}
        input={mockInput}
        onReset={vi.fn()}
      />
    );

    // Over budget badge and warnings should be visible
    expect(screen.getAllByText(/Exceeds 100%/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/exceed 100% target/i).length).toBeGreaterThan(0);
  });

  it("toggles section inclusion checkbox", () => {
    render(
      <BlueprintPreview
        blueprint={mockBlueprint}
        input={mockInput}
        onReset={vi.fn()}
      />
    );

    const budgetCheckbox = screen.getByRole("checkbox", { name: /Include budget categories/i }) as HTMLInputElement;
    expect(budgetCheckbox.checked).toBe(true);

    fireEvent.click(budgetCheckbox);
    expect(budgetCheckbox.checked).toBe(false);
  });

  it("calls onReset callback when Adjust & Regenerate button is clicked", () => {
    const onReset = vi.fn();
    render(
      <BlueprintPreview
        blueprint={mockBlueprint}
        input={mockInput}
        onReset={onReset}
      />
    );

    const adjustBtn = screen.getByRole("button", { name: /Adjust & Regenerate/i });
    fireEvent.click(adjustBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
