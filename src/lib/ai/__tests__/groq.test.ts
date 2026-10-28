import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GroqClient,
  cleanJsonString,
  sanitizeHexColor,
  normalizeBlueprintOutput,
  normalizeThemeOutput,
  normalizeCopilotOutput,
  normalizeDocumentExtraction,
} from "@/lib/ai/groq";
import { eventBlueprintSchema } from "@/types/blueprint.types";
import { themeConceptInputSchema } from "@/lib/dal/theme.dal";

describe("GroqClient Integration & Fallback", () => {
  const originalEnv = process.env.GROQ_API_KEY;

  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalEnv;
  });

  it("reports not configured when GROQ_API_KEY is not set", () => {
    expect(GroqClient.isConfigured()).toBe(false);
  });

  it("reports configured when a valid GROQ_API_KEY is present", () => {
    process.env.GROQ_API_KEY = "gsk_test_1234567890abcdef12345";
    expect(GroqClient.isConfigured()).toBe(true);
  });

  it("returns null gracefully if generateBlueprint is invoked without an API key", async () => {
    const blueprint = await GroqClient.generateBlueprint({
      eventType: "Wedding",
      guestCount: 100,
      totalBudget: 25000,
      currency: "USD",
    });
    expect(blueprint).toBeNull();
  });

  it("returns null gracefully if chatCopilot is invoked without an API key", async () => {
    const copilot = await GroqClient.chatCopilot({
      event: { title: "Celebration", event_type: "Birthday" },
      categories: [],
      tasks: [],
      userMessage: "Can we save $500?",
      conversationHistory: [],
    });
    expect(copilot).toBeNull();
  });

  it("returns null gracefully if generateTheme is invoked without an API key", async () => {
    const theme = await GroqClient.generateTheme("Minimalist Scandinavian", "Wedding");
    expect(theme).toBeNull();
  });

  it("returns null gracefully if extractDocumentVision is invoked without an API key", async () => {
    const doc = await GroqClient.extractDocumentVision({
      fileName: "quote.png",
      mimeType: "image/png",
      base64Data: "dGVzdA==",
    });
    expect(doc).toBeNull();
  });
});

describe("Groq LLM Response Normalizers & Sanitization", () => {
  it("cleanJsonString strips markdown code blocks and trims extraneous text", () => {
    const fenced = "```json\n{\"test\": 123}\n```";
    expect(cleanJsonString(fenced)).toBe("{\"test\": 123}");

    const withPreamble = "Here is the response:\n{\"status\": \"ok\"}\nHope this helps!";
    expect(cleanJsonString(withPreamble)).toBe("{\"status\": \"ok\"}");
  });

  it("sanitizeHexColor converts named colors, 3-digit hex, and raw hexes into valid #RRGGBB", () => {
    expect(sanitizeHexColor("navy")).toBe("#1B2A4A");
    expect(sanitizeHexColor("gold")).toBe("#D4AF37");
    expect(sanitizeHexColor("#fff")).toBe("#FFFFFF");
    expect(sanitizeHexColor("2D3748")).toBe("#2D3748");
    expect(sanitizeHexColor("  #4A7C7A  ")).toBe("#4A7C7A");
    expect(sanitizeHexColor("invalid-color", "#112233")).toBe("#112233");
  });

  it("normalizeBlueprintOutput normalizes and satisfies eventBlueprintSchema even with string numbers and loose fields", () => {
    const rawLLM = {
      overview: {
        title: "Celestial Gala 2026",
        eventType: "Gala",
        description: "An awe-inspiring celestial fundraiser.",
        suggestedTimelineMonths: "9 months",
        keyThemeSummary: "Deep cosmos with gold stardust",
        assumptions: ["Outdoor terrace available"],
      },
      budgetAllocations: [
        { category: "Venue", percentage: "45%", suggestedAmount: "$22,500", rationale: "Starlit glasshouse" },
        { category: "Production", percentage: "55%", suggestedAmount: "$27,500", rationale: "Staging and projection" },
      ],
      tasks: [
        {
          title: "Book observatory venue",
          description: "Sign exclusivity contract",
          relativeDaysBeforeEvent: "T-180",
          priority: "urgent",
          category: "Venue",
        },
      ],
      vendorRequirements: [
        {
          category: "Lighting",
          nameRecommendation: "Atmospheric Projection Specialists",
          estimatedCostRange: { min: "$8,000", max: "$12,000" },
          deliverables: ["Custom starfield mapping"],
          notes: "Need 4K laser projectors",
        },
      ],
      theme: {
        name: "Midnight Stellar",
        description: "Cosmic elegance",
        palette: ["midnight", "gold", "#fff", "slate"],
        decorDirection: "Constellation crystal sculptures",
        lightingStyling: "Bespoke ambient starlight",
        invitationDirection: "Black acrylic with gold foil",
      },
      contingencies: [
        {
          riskTitle: "Severe overcast cloud cover",
          probability: "Moderate",
          impact: "Critical",
          contingencyPlan: "Activate high-powered indoor celestial projection",
        },
      ],
    };

    const normalized = normalizeBlueprintOutput(rawLLM, {
      eventType: "Gala",
      title: "Celestial Gala 2026",
      totalBudget: 50000,
      guestCount: 200,
      currency: "USD",
    });

    const validated = eventBlueprintSchema.safeParse(normalized);
    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.data.overview.title).toBe("Celestial Gala 2026");
      expect(validated.data.overview.suggestedTimelineMonths).toBe(9);
      expect(validated.data.tasks[0].priority).toBe("critical");
      expect(validated.data.tasks[0].relativeDaysBeforeEvent).toBe(180);
      expect(validated.data.vendorRequirements[0].estimatedCostRange.min).toBe(8000);
      expect(validated.data.vendorRequirements[0].estimatedCostRange.max).toBe(12000);
      expect(validated.data.theme.palette[0].hex).toBe("#121829");
      expect(validated.data.contingencies[0].probability).toBe("medium");
      expect(validated.data.contingencies[0].impact).toBe("high");
    }
  });

  it("normalizeThemeOutput normalizes theme objects into valid themeConceptInputSchema", () => {
    const rawThemeLLM = {
      theme: {
        themeName: "Nordic Minimalist Fjord",
        conceptDescription: "Bleached birch, natural moss, and clean architectural lines.",
        palette: [
          { name: "Birch White", hex: "#FFF" },
          { name: "Fjord Slate", hex: "slate" },
          { name: "Moss Forest", hex: "forest" },
          { name: "Brass Accent", hex: "gold" },
        ],
        decorDirection: "Minimalist bleached wood and matte pottery",
        lightingDirection: "Low-voltage 2200K ambient candles",
        floralIdeas: "Bare birch branches and preserved lichen",
        invitationDirection: "Embossed raw cotton with typography",
      },
    };

    const normalized = normalizeThemeOutput(rawThemeLLM, "Nordic Minimalist Fjord");
    const validated = themeConceptInputSchema.safeParse(normalized);

    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.data.name).toBe("Nordic Minimalist Fjord");
      expect(validated.data.colorPalette[0].hex).toBe("#FFFFFF");
      expect(validated.data.colorPalette[1].hex).toBe("#708090");
      expect(validated.data.lightingStyling).toBe("Low-voltage 2200K ambient candles");
    }
  });

  it("normalizeCopilotOutput cleans proposal impact and action types", () => {
    const rawCopilotLLM = {
      reply: "We can save approximately $1,200 by re-negotiating floral selections.",
      proposal: {
        actionType: "budget_cut",
        summary: "Reduce floral budget by $1,200",
        explanation: "Switching imported lilies to local garden roses.",
        financialImpact: {
          category: "Floral & Decor",
          amountDelta: "-1200",
        },
        tradeOffs: ["Fewer imported stems"],
      },
    };

    const normalized = normalizeCopilotOutput(rawCopilotLLM);
    expect(normalized.reply).toContain("save approximately $1,200");
    expect(normalized.proposal?.actionType).toBe("adjust_budget");
    expect(normalized.proposal?.financialImpact?.amountDelta).toBe(-1200);
  });

  it("normalizeDocumentExtraction cleans vision OCR output into structured invoice data with email and phone", () => {
    const rawVisionLLM = {
      vendorName: "Grand Vista Ballroom",
      vendorEmail: "events@grandvista.com",
      vendorPhone: "+1 (555) 234-5678",
      amount: "$14,500.00",
      date: "2026-11-15",
      suggestedCategory: "Venue",
      documentType: "invoice",
      lineItems: ["Hall buyout: $12,000", "Cleaning fee: $2,500"],
      uncertainties: [],
    };

    const normalized = normalizeDocumentExtraction(rawVisionLLM, "invoice.png");
    expect(normalized.vendorName).toBe("Grand Vista Ballroom");
    expect(normalized.vendorEmail).toBe("events@grandvista.com");
    expect(normalized.vendorPhone).toBe("+1 (555) 234-5678");
    expect(normalized.amount).toBe(14500);
    expect(normalized.suggestedCategory).toBe("Venue & Rentals");
    expect(normalized.documentType).toBe("invoice");
    expect(normalized.lineItems.length).toBe(2);
  });
});
