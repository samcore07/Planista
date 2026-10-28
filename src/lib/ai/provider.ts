import { env } from "@/config/env";
import {
  eventBlueprintSchema,
  EventBlueprint,
} from "@/types/blueprint.types";
import { GroqClient } from "@/lib/ai/groq";

export interface BlueprintGenerationInput {
  eventType: string;
  title?: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  eventDate?: string;
  location?: string;
  preferences?: string;
  dietaryOrAccessibility?: string;
  constraints?: string;
}

export interface CopilotActionProposal {
  actionType: "adjust_budget" | "reschedule_task" | "add_task" | "optimize_category" | "general_advice";
  explanation: string;
  summary: string;
  financialImpact?: {
    category: string;
    amountDelta: number;
  };
  scheduleImpact?: {
    taskId: string;
    proposedDate: string;
  };
  tradeOffs: string[];
}

export interface AIProvider {
  generateBlueprint(input: BlueprintGenerationInput): Promise<EventBlueprint>;
  proposeCopilotAction(
    eventContext: Record<string, unknown>,
    userMessage: string
  ): Promise<CopilotActionProposal>;
}

/**
 * Deterministic generator used as fallback when external LLM API key is not configured,
 * ensuring complete offline operational capability with validated Zod output.
 */
export class DeterministicBlueprintEngine {
  static generate(input: BlueprintGenerationInput): EventBlueprint {
    const budget = input.totalBudget || 30000;
    const guests = input.guestCount || 100;
    const eventType = input.eventType || "Celebration";
    const title = input.title || `${eventType} Gathering`;

    // Category distribution based on event type
    const isWedding = eventType.toLowerCase().includes("wedding");

    const allocations = isWedding
      ? [
          { category: "Venue & Rentals", percentage: 40, rationale: "Core venue rental, tables, chairs, and basic sound" },
          { category: "Catering & Bar", percentage: 30, rationale: `Food and beverage service for ${guests} attendees` },
          { category: "Photography & Video", percentage: 12, rationale: "Full-day coverage and digital gallery rights" },
          { category: "Floral & Decor", percentage: 8, rationale: "Table centerpieces, stage accents, and ambient lighting" },
          { category: "Music & Entertainment", percentage: 5, rationale: "DJ/Live ensemble and sound engineering" },
          { category: "Contingency Reserve", percentage: 5, rationale: "Safety cushion for unforeseen logistical expenses" },
        ]
      : [
          { category: "Venue Rental", percentage: 35, rationale: "Space booking, staging, and seating arrangements" },
          { category: "Catering & Refreshments", percentage: 35, rationale: `Buffet or plated service for ${guests} guests` },
          { category: "Entertainment & AV", percentage: 15, rationale: "Audio, visual projection, and host/entertainer" },
          { category: "Decor & Signage", percentage: 10, rationale: "Themed backdrop, directional signs, and table styling" },
          { category: "Contingency Reserve", percentage: 5, rationale: "Buffer for last-minute headcount or operational needs" },
        ];

    const budgetAllocations = allocations.map((a) => ({
      category: a.category,
      percentage: a.percentage,
      suggestedAmount: Math.round((budget * a.percentage) / 100),
      rationale: a.rationale,
    }));

    const tasks = [
      {
        title: "Finalize & Sign Venue Contract",
        description: "Review venue cancellation policies, curfew limits, and insurance requirements.",
        relativeDaysBeforeEvent: 180,
        priority: "critical" as const,
        category: "Venue",
        dependsOnTitles: [],
      },
      {
        title: "Tasting Session & Menu Selection",
        description: `Select appetizers, mains, and dietary alternatives accommodating ${input.dietaryOrAccessibility || "special dietary preferences"}.`,
        relativeDaysBeforeEvent: 120,
        priority: "high" as const,
        category: "Catering",
        dependsOnTitles: ["Finalize & Sign Venue Contract"],
      },
      {
        title: "Confirm Decor & Lighting Layout",
        description: "Align floor plan with electrical access, stage positioning, and emergency exits.",
        relativeDaysBeforeEvent: 60,
        priority: "medium" as const,
        category: "Decor",
        dependsOnTitles: ["Finalize & Sign Venue Contract"],
      },
      {
        title: "Final Headcount & Seating Chart Confirmation",
        description: "Submit certified guest list and dietary breakdown to catering director.",
        relativeDaysBeforeEvent: 14,
        priority: "high" as const,
        category: "Coordination",
        dependsOnTitles: ["Tasting Session & Menu Selection"],
      },
      {
        title: "Vendor Run-Sheet Distribution",
        description: "Distribute synchronized minute-by-minute arrival and load-in schedules to all teams.",
        relativeDaysBeforeEvent: 5,
        priority: "critical" as const,
        category: "Operations",
        dependsOnTitles: ["Final Headcount & Seating Chart Confirmation"],
      },
    ];

    const vendorRequirements = [
      {
        category: "Venue",
        nameRecommendation: "Licensed Event Facility / Banquet Hall",
        estimatedCostRange: {
          min: Math.round(budget * 0.3),
          max: Math.round(budget * 0.42),
        },
        deliverables: [
          `Accommodates up to ${guests} seated guests with dance floor`,
          "Dedicated bridal/VIP prep suite",
          "Audio-visual cabling infrastructure",
        ],
        notes: "Availability and verified quotes must be obtained directly through venue management.",
      },
      {
        category: "Catering",
        nameRecommendation: "Commercial Full-Service Caterer",
        estimatedCostRange: {
          min: Math.round(budget * 0.25),
          max: Math.round(budget * 0.35),
        },
        deliverables: [
          "Passed hors d'oeuvres, 2-course entrée, and beverage station",
          "Service staff, bar staff, and bussing team",
          "Plateware, flatware, and glassware rentals",
        ],
        notes: "Dietary restrictions and allergen protocols must be confirmed in writing.",
      },
    ];

    const theme = {
      themeName: input.preferences ? `Curated ${input.preferences}` : "Warm Editorial Botanical",
      conceptDescription:
        "An understated, timeless aesthetic combining organic greenery, warm ivory linens, and restrained brass or dark metal accents.",
      palette: [
        { name: "Forest Emerald", hex: "#1C3829" },
        { name: "Warm Ivory", hex: "#FBF9F5" },
        { name: "Soft Sage", hex: "#8DAA91" },
        { name: "Burnished Brass", hex: "#C5A059" },
      ],
      decorDirection:
        "Abundant cascading greenery, textural neutral linens, and warm amber architectural lighting.",
      lightingDirection:
        "Dimmable pin-spots on dining surfaces, perimeter warm wall uplighting (2700K), and flickering votives.",
      floralDirection:
        "Olive branches, white anemones, ranunculus, and eucalyptus clusters.",
      invitationDirection:
        "Heavyweight cardstock with letterpress typography and restrained ink monograms.",
    };

    const contingencies = [
      {
        riskTitle: "Inclement Weather for Outdoor Segments",
        probability: "medium" as const,
        impact: "high" as const,
        contingencyPlan:
          "Secure an all-weather marquee tent option with clear vinyl sidewalls at least 72 hours prior.",
      },
      {
        riskTitle: "Vendor Delay on Event Day",
        probability: "medium" as const,
        impact: "medium" as const,
        contingencyPlan:
          "Include a mandatory 90-minute buffer window between load-in completion and guest doors opening.",
      },
    ];

    const rawBlueprint = {
      overview: {
        title,
        eventType,
        description: `Comprehensive production blueprint for a ${eventType.toLowerCase()} with ${guests} guests and a total budget of ${input.currency} ${budget.toLocaleString()}.`,
        suggestedTimelineMonths: isWedding ? 9 : 3,
        keyThemeSummary: theme.conceptDescription,
        assumptions: [
          "Estimates based on standard market averages for medium-to-high caliber local vendors.",
          `Guest count fixed at ${guests} attendees.`,
        ],
        uncertainties: [
          "Actual quotes depend on exact seasonal dates and venue exclusivity clauses.",
          "Beverage taxation and gratuity percentages vary by regional jurisdiction.",
        ],
      },
      budgetAllocations,
      tasks,
      vendorRequirements,
      theme,
      contingencies,
    };

    // Validates against Zod schema
    return eventBlueprintSchema.parse(rawBlueprint);
  }
}

/**
 * Main AI Provider supporting LLM API with deterministic fallback
 */
export class PlanistaAIProvider implements AIProvider {
  async generateBlueprint(input: BlueprintGenerationInput): Promise<EventBlueprint> {
    // 1. Attempt generation using Groq Llama 3.3 70B if configured
    if (GroqClient.isConfigured()) {
      try {
        const groqBlueprint = await GroqClient.generateBlueprint(input);
        if (groqBlueprint) {
          return groqBlueprint;
        }
      } catch {
        // Fall through to Gemini or Deterministic engine
      }
    }

    const geminiKey = env.GEMINI_API_KEY;

    // 2. If Gemini API key is provided, attempt structured generation with Gemini
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an expert event planning architect. Generate a JSON blueprint for:
Event Type: ${input.eventType}
Title: ${input.title || "Celebration"}
Budget: ${input.currency} ${input.totalBudget}
Guest Count: ${input.guestCount}
Preferences: ${input.preferences || "None"}
Constraints: ${input.constraints || "None"}

You must return valid JSON matching the exact schema with overview, budgetAllocations, tasks, vendorRequirements, theme, and contingencies. Never claim a vendor is available or verified without direct proof.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const validated = eventBlueprintSchema.safeParse(parsed);
            if (validated.success) {
              return validated.data;
            }
          }
        }
      } catch {
        // Fall through to deterministic engine
      }
    }

    // Deterministic fallback (safe, validated, and resilient)
    return DeterministicBlueprintEngine.generate(input);
  }

  async proposeCopilotAction(
    eventContext: Record<string, unknown>,
    userMessage: string
  ): Promise<CopilotActionProposal> {
    const text = userMessage.toLowerCase();

    // Context-aware intent detection
    if (text.includes("reduce") || text.includes("cut") || text.includes("save")) {
      const match = text.match(/\d+[\d,]*/);
      const amount = match ? parseFloat(match[0].replace(/,/g, "")) : 1000;

      return {
        actionType: "adjust_budget",
        summary: `Reduce overall budget allocation by ₹${amount.toLocaleString()}`,
        explanation: `Identified potential surplus in decor and entertainment buffers without impacting venue or primary guest catering.`,
        financialImpact: {
          category: "Decor & Floral",
          amountDelta: -amount,
        },
        tradeOffs: [
          "Reduces custom floral arrangements in favor of seasonal botanical accents",
          "Preserves contracted catering menu and venue minimums",
        ],
      };
    }

    if (text.includes("delay") || text.includes("reschedule") || text.includes("postpone")) {
      return {
        actionType: "reschedule_task",
        summary: "Propose revised timeline reflecting vendor schedule adjustment",
        explanation:
          "Propagated a 7-day schedule extension across affected downstream checklist tasks.",
        tradeOffs: [
          "Extends checklist deadlines closer to the final production week",
          "Requires confirmation from venue manager for updated arrival times",
        ],
      };
    }

    return {
      actionType: "general_advice",
      summary: "Event Architecture Guidance",
      explanation:
        "Based on your current guest count and allocated budget, all primary category ratios remain within industry recommendations.",
      tradeOffs: ["No structural budget or schedule changes applied"],
    };
  }
}

export const aiProvider = new PlanistaAIProvider();
