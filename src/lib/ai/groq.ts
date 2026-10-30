import { env } from "@/config/env";
import { fetchWithRetryAndTimeout } from "@/lib/reliability/fetch-retry";
import {
  eventBlueprintSchema,
  EventBlueprint,
  recommendProcessHours,
} from "@/types/blueprint.types";
import { BlueprintGenerationInput, CopilotActionProposal } from "@/lib/ai/provider";
import { ThemeConceptInput, themeConceptInputSchema } from "@/lib/dal/theme.dal";
import { ExtractedDocumentData } from "@/lib/dal/documents.dal";

export { recommendProcessHours };

const GROQ_API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

let cachedTextModel: string | null = null;

type RecordUnknown = Record<string, unknown>;

function toRecord(val: unknown): RecordUnknown {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as RecordUnknown;
  }
  return {};
}

/**
 * Strips markdown code block wrappers from LLM string output
 */
export function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  // Strip markdown code fences like ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "");
  }
  // If there's extra text before the first '{' and after the last '}'
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

/**
 * Sanitizes any color string into a strict 6-digit hex format (#RRGGBB)
 */
export function sanitizeHexColor(color: unknown, fallback: string = "#4A7C7A"): string {
  if (typeof color !== "string") return fallback;
  let c = color.trim().toLowerCase();

  const namedColors: Record<string, string> = {
    navy: "#1B2A4A",
    midnight: "#121829",
    gold: "#D4AF37",
    champagne: "#F7E7CE",
    sage: "#9CAF88",
    blush: "#DE5D83",
    ivory: "#FFFFF0",
    emerald: "#50C878",
    terracotta: "#E2725B",
    burgundy: "#800020",
    mauve: "#E0B0FF",
    olive: "#808000",
    teal: "#008080",
    slate: "#708090",
    cream: "#FFFDD0",
    rose: "#FF007F",
    coral: "#FF7F50",
    copper: "#B87333",
    bronze: "#CD7F32",
    charcoal: "#36454F",
    black: "#1A1A1A",
    white: "#FFFFFF",
    silver: "#C0C0C0",
    taupe: "#B38B6D",
    forest: "#228B22",
    amber: "#FFBF00",
  };

  if (namedColors[c]) return namedColors[c];

  if (!c.startsWith("#")) {
    c = "#" + c;
  }

  // 3-digit hex (#RGB -> #RRGGBB)
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toUpperCase();
  }

  // 6-digit hex
  if (/^#[0-9a-f]{6}$/i.test(c)) {
    return c.toUpperCase();
  }

  // 8-digit hex (#RRGGBBAA -> strip alpha)
  if (/^#[0-9a-f]{8}$/i.test(c)) {
    return c.slice(0, 7).toUpperCase();
  }

  return fallback;
}

/**
 * Normalizes raw LLM output into strict schema-compliant EventBlueprint
 */
export function normalizeBlueprintOutput(raw: unknown, input: BlueprintGenerationInput): EventBlueprint {
  const root = toRecord(raw);
  // Unwrap if nested under "blueprint", "eventBlueprint", or "data"
  const data = toRecord(root.blueprint || root.eventBlueprint || root.data || root);

  // 1. Overview
  const rawOverview = toRecord(data.overview);
  const overview = {
    title: String(rawOverview.title || rawOverview.name || input.title || `${input.eventType} Gathering`).trim(),
    eventType: String(rawOverview.eventType || input.eventType || "Celebration").trim(),
    description: String(rawOverview.description || "Comprehensive production plan designed for cohesive flow and memorable guest experience.").trim(),
    suggestedTimelineMonths: Math.max(1, Math.round(Number(String(rawOverview.suggestedTimelineMonths || 6).replace(/[^0-9.]/g, "")) || 6)),
    keyThemeSummary: String(rawOverview.keyThemeSummary || rawOverview.themeSummary || rawOverview.theme || "Harmonized modern aesthetic with intentional detailing.").trim(),
    assumptions: Array.isArray(rawOverview.assumptions) && rawOverview.assumptions.length > 0
      ? rawOverview.assumptions.map(String)
      : ["Guest count verified with preliminary RSVP target", "Standard weather protections applied to open spaces"],
    uncertainties: Array.isArray(rawOverview.uncertainties) && rawOverview.uncertainties.length > 0
      ? rawOverview.uncertainties.map(String)
      : ["Final vendor delivery windows dependent on production schedule"],
  };

  // 2. Budget Allocations
  let rawAllocations = Array.isArray(data.budgetAllocations) ? data.budgetAllocations : [];
  if (rawAllocations.length === 0 && Array.isArray(data.budget)) {
    rawAllocations = data.budget;
  }

  const totalBudget = Math.max(1000, Number(input.totalBudget) || 25000);

  let budgetAllocations = rawAllocations.map((item: unknown, idx: number) => {
    const alloc = toRecord(item);
    const rawPct = Number(String(alloc.percentage || 0).replace("%", "")) || 0;
    const rawAmt = Number(String(alloc.suggestedAmount || alloc.amount || 0).replace(/[^0-9.]/g, "")) || 0;
    return {
      category: String(alloc.category || alloc.name || `Category ${idx + 1}`).trim(),
      percentage: Math.max(0, Math.min(100, Math.round(rawPct))),
      suggestedAmount: Math.max(0, Math.round(rawAmt)),
      rationale: String(alloc.rationale || alloc.notes || alloc.description || "Core operational and design allocation.").trim(),
    };
  });

  if (budgetAllocations.length === 0) {
    budgetAllocations = [
      { category: "Venue & Rentals", percentage: 40, suggestedAmount: Math.round(totalBudget * 0.40), rationale: "Primary venue footprint and furnishings" },
      { category: "Catering & Bar", percentage: 25, suggestedAmount: Math.round(totalBudget * 0.25), rationale: "Elevated dining, staffing, and bar service" },
      { category: "Photography & Media", percentage: 12, suggestedAmount: Math.round(totalBudget * 0.12), rationale: "Full event documentation and coverage" },
      { category: "Floral & Decor", percentage: 10, suggestedAmount: Math.round(totalBudget * 0.10), rationale: "Atmospheric florals, linens, and styling" },
      { category: "Entertainment & Sound", percentage: 8, suggestedAmount: Math.round(totalBudget * 0.08), rationale: "Audio production and live performance" },
      { category: "Contingency & Reserves", percentage: 5, suggestedAmount: Math.round(totalBudget * 0.05), rationale: "Unforeseen adjustments buffer" },
    ];
  } else {
    // Renormalize percentages if they don't sum to 100
    const sumPct = budgetAllocations.reduce((acc, b) => acc + b.percentage, 0);
    if (sumPct > 0 && sumPct !== 100) {
      budgetAllocations = budgetAllocations.map((b) => {
        const adjustedPct = Math.round((b.percentage / sumPct) * 100);
        return {
          ...b,
          percentage: adjustedPct,
          suggestedAmount: b.suggestedAmount > 0 ? b.suggestedAmount : Math.round((adjustedPct / 100) * totalBudget),
        };
      });
      const diff = 100 - budgetAllocations.reduce((acc, b) => acc + b.percentage, 0);
      if (diff !== 0 && budgetAllocations.length > 0) {
        budgetAllocations[budgetAllocations.length - 1].percentage += diff;
      }
    }
  }

  // 3. Tasks
  let rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
  if (rawTasks.length === 0 && Array.isArray(data.timeline)) {
    rawTasks = data.timeline;
  }

  const tasks = (rawTasks.length > 0 ? rawTasks : [
    { title: "Confirm venue contract & deposit", description: "Lock down location dates and operational guidelines", relativeDaysBeforeEvent: 180, priority: "critical", category: "Venue & Rentals", estimatedDurationHours: 4.0 },
    { title: "Retain key catering and bar partner", description: "Conduct menu tasting and finalize staffing headcounts", relativeDaysBeforeEvent: 120, priority: "high", category: "Catering & Bar", estimatedDurationHours: 3.0 },
    { title: "Review decor and spatial floorplan", description: "Align lighting, florals, and seating arrangement", relativeDaysBeforeEvent: 60, priority: "medium", category: "Floral & Decor", estimatedDurationHours: 2.5 },
    { title: "Finalize run of show & vendor delivery schedule", description: "Distribute master schedule to all operational partners", relativeDaysBeforeEvent: 14, priority: "critical", category: "General Production", estimatedDurationHours: 3.5 },
  ]).map((item: unknown) => {
    const t = toRecord(item);
    const rawPriority = String(t.priority || "medium").toLowerCase().trim();
    let priority: "low" | "medium" | "high" | "critical" = "medium";
    if (rawPriority.includes("crit") || rawPriority.includes("urg") || rawPriority.includes("p0")) {
      priority = "critical";
    } else if (rawPriority.includes("high") || rawPriority.includes("p1") || rawPriority.includes("imp")) {
      priority = "high";
    } else if (rawPriority.includes("low") || rawPriority.includes("p3") || rawPriority.includes("min")) {
      priority = "low";
    }

    const rawDays = Number(String(t.relativeDaysBeforeEvent || t.daysBeforeEvent || 30).replace(/[^0-9-]/g, "")) || 30;
    const relativeDaysBeforeEvent = Math.abs(Math.round(rawDays));

    const title = String(t.title || "Checklist Task").trim();
    const description = String(t.description || "").trim();
    const category = String(t.category || "General").trim();

    const rawHours = Number(String(t.estimatedDurationHours ?? t.estimated_duration_hours ?? t.processHours ?? t.durationHours ?? 0).replace(/[^0-9.]/g, "")) || 0;
    const estimatedDurationHours = rawHours > 0 ? Math.round(rawHours * 10) / 10 : recommendProcessHours(priority, category, title);

    return {
      title,
      description,
      relativeDaysBeforeEvent,
      priority,
      category,
      dependsOnTitles: Array.isArray(t.dependsOnTitles) ? t.dependsOnTitles.map(String) : Array.isArray(t.dependencies) ? t.dependencies.map(String) : [],
      estimatedDurationHours,
    };
  });

  // 4. Vendor Requirements
  let rawVendors = Array.isArray(data.vendorRequirements) ? data.vendorRequirements : [];
  if (rawVendors.length === 0 && Array.isArray(data.vendors)) {
    rawVendors = data.vendors;
  }

  const vendorRequirements = (rawVendors.length > 0 ? rawVendors : [
    { category: "Venue", nameRecommendation: "Historic Loft or Contemporary Pavilion", estimatedCostRange: { min: Math.round(totalBudget * 0.35), max: Math.round(totalBudget * 0.45) }, deliverables: ["Full site buyout", "Load-in access 4 hours prior"], notes: "Requires certificate of insurance" },
    { category: "Catering", nameRecommendation: "Full-Service Seasonal Farm-to-Table Caterer", estimatedCostRange: { min: Math.round(totalBudget * 0.20), max: Math.round(totalBudget * 0.30) }, deliverables: ["Plated 3-course dinner", "Bar service staff"], notes: "Accommodate all dietary restrictions" },
  ]).map((item: unknown, idx: number) => {
    const v = toRecord(item);
    let minCost = 0;
    let maxCost = 0;
    if (v.estimatedCostRange && typeof v.estimatedCostRange === "object") {
      const range = toRecord(v.estimatedCostRange);
      minCost = Number(String(range.min || range.low || 0).replace(/[^0-9.]/g, "")) || 0;
      maxCost = Number(String(range.max || range.high || 0).replace(/[^0-9.]/g, "")) || 0;
    }
    if (maxCost <= 0) maxCost = minCost > 0 ? minCost * 1.5 : 2000;
    if (minCost <= 0) minCost = Math.round(maxCost * 0.7);

    return {
      category: String(v.category || `Vendor ${idx + 1}`).trim(),
      nameRecommendation: String(v.nameRecommendation || v.name || v.vendorType || "Specialist Partner").trim(),
      estimatedCostRange: {
        min: Math.max(0, Math.round(minCost)),
        max: Math.max(minCost, Math.round(maxCost)),
      },
      deliverables: Array.isArray(v.deliverables) && v.deliverables.length > 0
        ? v.deliverables.map(String)
        : ["Dedicated coordination and flawless on-site delivery"],
      notes: String(v.notes || v.description || "").trim(),
    };
  });

  // 5. Theme
  const rawTheme = toRecord(data.theme);
  const rawPalette = Array.isArray(rawTheme.palette)
    ? rawTheme.palette
    : Array.isArray(rawTheme.colorPalette)
    ? rawTheme.colorPalette
    : Array.isArray(rawTheme.colors)
    ? rawTheme.colors
    : [];

  const defaultSwatches = [
    { name: "Deep Charcoal", hex: "#2D3748" },
    { name: "Warm Champagne", hex: "#E2D4C3" },
    { name: "Sage Mist", hex: "#9CAF88" },
    { name: "Alabaster White", hex: "#F7FAFC" },
  ];

  const palette = (rawPalette.length >= 2 ? rawPalette : defaultSwatches).map((s: unknown, idx: number) => {
    if (typeof s === "string") {
      return {
        name: `Accent ${idx + 1}`,
        hex: sanitizeHexColor(s, defaultSwatches[idx % defaultSwatches.length].hex),
      };
    }
    const swatch = toRecord(s);
    return {
      name: String(swatch.name || swatch.color || `Swatch ${idx + 1}`).trim(),
      hex: sanitizeHexColor(swatch.hex || swatch.color || swatch.value, defaultSwatches[idx % defaultSwatches.length].hex),
    };
  });

  const theme = {
    themeName: String(rawTheme.themeName || rawTheme.name || `${input.eventType} Signature Direction`).trim(),
    conceptDescription: String(rawTheme.conceptDescription || rawTheme.description || "A curated aesthetic designed to blend modern elegance with warm hospitality.").trim(),
    palette,
    decorDirection: String(rawTheme.decorDirection || rawTheme.decor || "Minimalist tablescapes with textured linens and architectural floral accents.").trim(),
    lightingDirection: String(rawTheme.lightingDirection || rawTheme.lightingStyling || rawTheme.lighting || "Warm, indirect 2700K lighting with delicate candle clusters.").trim(),
    floralDirection: typeof rawTheme.floralDirection === "string" ? rawTheme.floralDirection : typeof rawTheme.floralIdeas === "string" ? rawTheme.floralIdeas : undefined,
    invitationDirection: String(rawTheme.invitationDirection || rawTheme.stationeryDirection || "Modern typography on heavy cotton stock with blind debossing.").trim(),
  };

  // 6. Contingencies
  let rawContingencies = Array.isArray(data.contingencies) ? data.contingencies : [];
  if (rawContingencies.length === 0 && Array.isArray(data.risks)) {
    rawContingencies = data.risks;
  }

  const contingencies = (rawContingencies.length > 0 ? rawContingencies : [
    { riskTitle: "Inclement weather during outdoor segments", probability: "medium", impact: "high", contingencyPlan: "Reserve transparent marquee tent 72 hours prior." },
    { riskTitle: "Key supplier delivery delay", probability: "low", impact: "medium", contingencyPlan: "Contract secondary backup vendor on standby." },
  ]).map((item: unknown) => {
    const c = toRecord(item);
    const rawProb = String(c.probability || "medium").toLowerCase();
    const probability: "low" | "medium" | "high" = rawProb.includes("high") ? "high" : rawProb.includes("low") ? "low" : "medium";

    const rawImp = String(c.impact || "medium").toLowerCase();
    const impact: "low" | "medium" | "high" = (rawImp.includes("high") || rawImp.includes("crit") || rawImp.includes("sev")) ? "high" : rawImp.includes("low") ? "low" : "medium";

    return {
      riskTitle: String(c.riskTitle || c.title || c.risk || "Operational Risk").trim(),
      probability,
      impact,
      contingencyPlan: String(c.contingencyPlan || c.plan || c.mitigation || "Enact on-site response plan").trim(),
    };
  });

  return {
    overview,
    budgetAllocations,
    tasks,
    vendorRequirements,
    theme,
    contingencies,
  };
}

/**
 * Normalizes raw LLM output into strict schema-compliant ThemeConceptInput
 */
export function normalizeThemeOutput(raw: unknown, fallbackName: string = "Signature Theme"): ThemeConceptInput {
  const root = toRecord(raw);
  const data = toRecord(root.theme || root.concept || root.themeConcept || root);

  const defaultSwatches = [
    { name: "Deep Navy", hex: "#1B2A4A" },
    { name: "Brushed Champagne", hex: "#D6C7B2" },
    { name: "Alabaster Foam", hex: "#EAF2F1" },
    { name: "Warm Gold", hex: "#D4AF37" },
  ];

  const rawPalette = Array.isArray(data.colorPalette)
    ? data.colorPalette
    : Array.isArray(data.palette)
    ? data.palette
    : Array.isArray(data.colors)
    ? data.colors
    : [];

  const colorPalette = (rawPalette.length >= 2 ? rawPalette : defaultSwatches).map((s: unknown, idx: number) => {
    if (typeof s === "string") {
      return {
        name: `Tone ${idx + 1}`,
        hex: sanitizeHexColor(s, defaultSwatches[idx % defaultSwatches.length].hex),
      };
    }
    const swatch = toRecord(s);
    return {
      name: String(swatch.name || swatch.color || `Swatch ${idx + 1}`).trim(),
      hex: sanitizeHexColor(swatch.hex || swatch.color || swatch.value, defaultSwatches[idx % defaultSwatches.length].hex),
    };
  });

  return {
    name: String(data.name || data.themeName || data.title || fallbackName).trim(),
    description: String(data.description || data.conceptDescription || "Bespoke design concept harmonizing spatial elegance with cohesive visual cues.").trim(),
    colorPalette,
    decorDirection: String(data.decorDirection || data.decor || "Washed natural linens, architectural floral placements, and refined tabletop details.").trim(),
    lightingStyling: String(data.lightingStyling || data.lightingDirection || data.lighting || "Breeze-shielded ambient illumination with 2400K warm glow.").trim(),
    floralIdeas: String(data.floralIdeas || data.floralDirection || data.floral || "Seasonal textural stems, wild foliage, and delicate statement blooms.").trim(),
    invitationDirection: String(data.invitationDirection || data.stationeryDirection || "Deckled edge cotton paper with minimalist debossed typography.").trim(),
    moodboardUrls: [],
    isSelected: false,
  };
}

/**
 * Normalizes raw LLM output into strict schema-compliant Copilot response & proposal
 */
export function normalizeCopilotOutput(raw: unknown): { reply: string; proposal?: CopilotActionProposal } {
  const root = toRecord(raw);
  const reply = String(root.reply || root.response || root.message || "I've reviewed your event parameters and prepared recommendations.").trim();

  let proposal: CopilotActionProposal | undefined = undefined;

  if (root.proposal && typeof root.proposal === "object") {
    const rawP = toRecord(root.proposal);
    const rawAction = String(rawP.actionType || "").toLowerCase();
    let actionType: CopilotActionProposal["actionType"] = "general_advice";

    if (rawAction.includes("adjust") || rawAction.includes("budget") || rawAction.includes("cut")) {
      actionType = "adjust_budget";
    } else if (rawAction.includes("reschedule") || rawAction.includes("shift") || rawAction.includes("delay")) {
      actionType = "reschedule_task";
    } else if (rawAction.includes("add") || rawAction.includes("new_task")) {
      actionType = "add_task";
    } else if (rawAction.includes("optimize") || rawAction.includes("category")) {
      actionType = "optimize_category";
    }

    const summary = String(rawP.summary || rawP.title || "Recommended event adjustment").trim();
    const explanation = String(rawP.explanation || rawP.description || summary).trim();

    let financialImpact: { category: string; amountDelta: number } | undefined = undefined;
    if (rawP.financialImpact && typeof rawP.financialImpact === "object") {
      const fi = toRecord(rawP.financialImpact);
      const delta = Number(String(fi.amountDelta ?? 0).replace(/[^0-9.-]/g, "")) || 0;
      financialImpact = {
        category: String(fi.category || "General Budget").trim(),
        amountDelta: delta,
      };
    }

    let scheduleImpact: { taskId: string; proposedDate: string } | undefined = undefined;
    if (rawP.scheduleImpact && typeof rawP.scheduleImpact === "object") {
      const si = toRecord(rawP.scheduleImpact);
      scheduleImpact = {
        taskId: String(si.taskId || "").trim(),
        proposedDate: String(si.proposedDate || new Date().toISOString().split("T")[0]).trim(),
      };
    }

    const tradeOffs = Array.isArray(rawP.tradeOffs) ? rawP.tradeOffs.map(String) : [];

    proposal = {
      actionType,
      summary,
      explanation,
      financialImpact,
      scheduleImpact,
      tradeOffs,
    };
  }

  return { reply, proposal };
}

/**
 * Normalizes raw LLM vision extraction into ExtractedDocumentData
 */
export function normalizeDocumentExtraction(raw: unknown, fileName?: string): ExtractedDocumentData {
  const root = toRecord(raw);
  const data = toRecord(root.extraction || root.document || root);
  const amount = Number(String(data.amount || 0).replace(/[^0-9.]/g, "")) || 0;

  const validCategories = [
    "Venue & Rentals",
    "Catering & Bar",
    "Photography & Video",
    "Floral & Decor",
    "Music & Entertainment",
    "Stationery & Favors",
    "Other",
  ];

  let suggestedCategory = String(data.suggestedCategory || "Venue & Rentals").trim();
  if (!validCategories.includes(suggestedCategory)) {
    const match = validCategories.find(c => c.toLowerCase().includes(suggestedCategory.toLowerCase()));
    suggestedCategory = match || "Other";
  }

  const validTypes: ExtractedDocumentData["documentType"][] = ["invoice", "receipt", "quote", "contract"];
  let documentType = String(data.documentType || "quote").toLowerCase().trim() as ExtractedDocumentData["documentType"];
  if (!validTypes.includes(documentType)) {
    documentType = "quote";
  }

  const fallbackVendor = fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : "Vendor Partner";

  // Extract contact email & phone if present
  let vendorEmail: string | null = null;
  const rawEmail = String(data.vendorEmail || data.email || data.contact_email || data.contactEmail || "").trim();
  if (rawEmail && rawEmail.includes("@") && rawEmail.toLowerCase() !== "null") {
    vendorEmail = rawEmail;
  }

  let vendorPhone: string | null = null;
  const rawPhone = String(data.vendorPhone || data.phone || data.contact_phone || data.contactPhone || data.tel || "").trim();
  if (rawPhone && rawPhone.length >= 7 && rawPhone.toLowerCase() !== "null") {
    vendorPhone = rawPhone;
  }

  return {
    vendorName: String(data.vendorName || data.vendor || fallbackVendor).trim(),
    vendorEmail,
    vendorPhone,
    amount,
    date: String(data.date || new Date().toISOString().split("T")[0]).trim(),
    suggestedCategory,
    documentType,
    lineItems: Array.isArray(data.lineItems) ? data.lineItems.map(String) : [],
    uncertainties: Array.isArray(data.uncertainties) ? data.uncertainties.map(String) : [],
    isOcrAvailable: true,
  };
}

export class GroqClient {
  static getApiKey(): string | undefined {
    const raw = process.env.GROQ_API_KEY || env.GROQ_API_KEY;
    return raw ? raw.trim() : undefined;
  }

  static isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && !key.includes("placeholder") && key.trim().length > 10;
  }

  /**
   * Dynamically resolves the best available chat model on the Groq account
   */
  static async resolveTextModel(apiKey: string): Promise<string> {
    if (cachedTextModel) return cachedTextModel;

    const PREFERRED_PRIORITY = [
      "openai/gpt-oss-120b",
      "llama-3.3-70b-versatile",
      "openai/gpt-oss-20b",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen/qwen3.8-27b",
      "allam-2-7b",
    ];

    try {
      const res = await fetchWithRetryAndTimeout(
        "https://api.groq.com/openai/v1/models",
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
        { timeoutMs: 10000, maxRetries: 2 }
      );
      if (res.ok) {
        const json = await res.json();
        const availableIds: string[] = (json.data || []).map((m: { id: string }) => m.id);
        if (process.env.NODE_ENV !== "production") {
          console.info(`[GroqClient] Available models on account: ${availableIds.join(", ")}`);
        }

        for (const candidate of PREFERRED_PRIORITY) {
          if (availableIds.includes(candidate)) {
            cachedTextModel = candidate;
            if (process.env.NODE_ENV !== "production") {
              console.info(`[GroqClient] Selected active model: "${cachedTextModel}"`);
            }
            return cachedTextModel;
          }
        }

        const fallback = availableIds.find((id) => !id.includes("whisper") && !id.includes("guard"));
        if (fallback) {
          cachedTextModel = fallback;
          return fallback;
        }
      }
    } catch (err) {
      console.warn("[GroqClient] Could not fetch models list:", err);
    }

    cachedTextModel = "openai/gpt-oss-120b";
    return cachedTextModel;
  }

  /**
   * Generates a comprehensive, schema-validated event blueprint using Groq AI
   */
  static async generateBlueprint(input: BlueprintGenerationInput): Promise<EventBlueprint | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const model = await this.resolveTextModel(apiKey);

    const systemPrompt = `You are Planista's Chief Event Production Architect.
Your task is to generate a comprehensive, highly realistic production blueprint for an upcoming event.
The blueprint MUST be valid JSON adhering strictly to this schema:
{
  "overview": {
    "title": string,
    "eventType": string,
    "description": string,
    "suggestedTimelineMonths": number,
    "keyThemeSummary": string,
    "assumptions": string[],
    "uncertainties": string[]
  },
  "budgetAllocations": [
    {
      "category": string,
      "percentage": number (0-100),
      "suggestedAmount": number,
      "rationale": string
    }
  ],
  "tasks": [
    {
      "title": string,
      "description": string,
      "relativeDaysBeforeEvent": number (positive integer, e.g. 180 means T-180 days before event),
      "priority": "low" | "medium" | "high" | "critical",
      "category": string,
      "dependsOnTitles": string[],
      "estimatedDurationHours": number (realistic process time in hours, e.g. 1.5, 2.0, 3.5, 4.0)
    }
  ],
  "vendorRequirements": [
    {
      "category": string,
      "nameRecommendation": string (generic archetype, e.g. "Boutique Fine-Art Wedding Photographer"),
      "estimatedCostRange": { "min": number, "max": number },
      "deliverables": string[],
      "notes": string
    }
  ],
  "theme": {
    "themeName": string,
    "conceptDescription": string,
    "palette": [{ "name": string, "hex": string (valid 6-digit hex like "#4A7C7A") }],
    "decorDirection": string,
    "lightingDirection": string,
    "invitationDirection": string
  },
  "contingencies": [
    {
      "riskTitle": string,
      "probability": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high",
      "contingencyPlan": string
    }
  ]
}

CRITICAL RULES:
1. The sum of all suggestedAmount in budgetAllocations MUST NOT exceed the total budget of ${input.currency} ${input.totalBudget}. The percentages must add up to 100%.
2. Provide 5 to 7 balanced budget categories.
3. Provide 6 to 10 chronologically organized milestone checklist tasks with realistic T-X day values, auto-recommended process hours (estimatedDurationHours), and logical dependencies.
4. Provide a gorgeous 4-to-5 swatch color palette with real hex codes.
5. Provide 3 to 5 actionable contingencies with clear mitigation steps.
6. Return ONLY the JSON object. Do not include markdown ticks, conversational text, or explanation outside the JSON.`;

    const userPrompt = `Event Parameters:
- Event Type: ${input.eventType}
- Title: ${input.title || `${input.eventType} Gathering`}
- Total Budget: ${input.currency} ${input.totalBudget}
- Guest Count: ${input.guestCount}
- Target Date: ${input.eventDate || "6 months from now"}
- Location: ${input.location || "City center venue"}
- Client Preferences: ${input.preferences || "Modern, elevated, and guest-centric"}
- Dietary/Accessibility: ${input.dietaryOrAccessibility || "Standard dietary accommodation"}
- Constraints: ${input.constraints || "Strict budget discipline"}`;

    try {
      const response = await fetchWithRetryAndTimeout(
        GROQ_API_ENDPOINT,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
          }),
        },
        { timeoutMs: 30000, maxRetries: 2 }
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[GroqClient] API error (${response.status} ${response.statusText}):`, errBody);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const cleaned = cleanJsonString(content);
      const parsed = JSON.parse(cleaned);
      const normalized = normalizeBlueprintOutput(parsed, input);
      const validated = eventBlueprintSchema.safeParse(normalized);

      if (validated.success) {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[GroqClient] Successfully generated AI blueprint for "${input.title || input.eventType}" using model ${model}`);
        }
        return validated.data;
      } else {
        console.warn("[GroqClient] Blueprint validation warning, returning sanitized structure:", validated.error.format());
        return normalized;
      }
    } catch (err) {
      console.error("[GroqClient] generateBlueprint exception:", err);
      return null;
    }
  }

  /**
   * Conversational Planning Copilot with contextual event intelligence and actionable proposal synthesis
   */
  static async chatCopilot(params: {
    event: Record<string, unknown>;
    categories: Record<string, unknown>[];
    tasks: Record<string, unknown>[];
    userMessage: string;
    conversationHistory: { sender: string; content: string }[];
  }): Promise<{ reply: string; proposal?: CopilotActionProposal } | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const model = await this.resolveTextModel(apiKey);

    const eventSummary = {
      title: params.event.title,
      type: params.event.event_type,
      budget: params.event.total_budget,
      currency: params.event.currency,
      guestCount: params.event.guest_count,
      categories: params.categories.map((c) => ({
        id: c.id,
        name: c.name,
        allocated: c.allocated_amount,
      })),
      tasks: params.tasks.slice(0, 15).map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.due_date,
        priority: t.priority,
        status: t.status,
      })),
    };

    const systemPrompt = `You are Planista's Lead Event Planning Copilot, an expert AI partner helping the planner coordinate their event with data-driven precision.
You have live access to the planner's active event workspace:
${JSON.stringify(eventSummary, null, 2)}

You must respond in valid JSON with two fields:
{
  "reply": string, // Natural, encouraging, professional advice or response to the planner.
  "proposal": {   // OPTIONAL: Include only if the user asks for a concrete change, budget adjustment, timeline shift, or new task!
    "actionType": "adjust_budget" | "reschedule_task" | "add_task" | "optimize_category" | "general_advice",
    "summary": string,
    "explanation": string,
    "financialImpact": { "category": string, "amountDelta": number }, // optional if budget action
    "scheduleImpact": { "taskId": string, "proposedDate": string }, // optional ISO string if task action
    "tradeOffs": string[] // list of realistic operational trade-offs
  } | null
}

Guidelines:
- If the user asks to cut or reduce budget, recommend a specific category and calculate the amountDelta (negative number for reductions).
- If the user asks about delays, weather contingencies, or rescheduling, construct a reschedule_task or add_task proposal.
- If the user asks for general advice, answer directly in "reply" with "proposal": null or actionType: "general_advice".
- Always be honest: never claim a vendor is booked or a quote is locked without confirmed contracts.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...params.conversationHistory.slice(-6).map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
      { role: "user", content: params.userMessage },
    ];

    try {
      const response = await fetchWithRetryAndTimeout(
        GROQ_API_ENDPOINT,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            response_format: { type: "json_object" },
            temperature: 0.3,
          }),
        },
        { timeoutMs: 25000, maxRetries: 2 }
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[GroqClient] Copilot API error (${response.status} ${response.statusText}):`, errBody);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const cleaned = cleanJsonString(content);
      const parsed = JSON.parse(cleaned);
      const normalized = normalizeCopilotOutput(parsed);
      if (process.env.NODE_ENV !== "production") {
        console.info(`[GroqClient] Successfully generated Copilot response using model ${model}`);
      }
      return normalized;
    } catch (err) {
      console.error("[GroqClient] chatCopilot exception:", err);
      return null;
    }
  }

  /**
   * Generates a creative bespoke theme concept using Groq AI
   */
  static async generateTheme(promptText: string, eventType: string = "Celebration"): Promise<ThemeConceptInput | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const model = await this.resolveTextModel(apiKey);

    const systemPrompt = `You are Planista's Creative Director & Event Stylist.
Generate an extraordinary, bespoke theme and design concept based on the user's aesthetic vision.
You must return valid JSON strictly matching this schema:
{
  "name": string,
  "description": string,
  "colorPalette": [
    { "name": string, "hex": string (valid 6-digit hex e.g. "#2D3748") }
  ],
  "decorDirection": string,
  "lightingStyling": string,
  "floralIdeas": string,
  "invitationDirection": string
}

Requirements:
- Provide 4 to 5 beautifully coordinated color swatches with precise, aesthetically cohesive hex codes.
- Ensure the name and description are evocative and sophisticated.
- Provide actionable, specific decor, lighting, and stationery details.
- Return ONLY JSON.`;

    try {
      const response = await fetchWithRetryAndTimeout(
        GROQ_API_ENDPOINT,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Event Type: ${eventType}\nTheme Prompt: ${promptText}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.5,
          }),
        },
        { timeoutMs: 25000, maxRetries: 2 }
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[GroqClient] generateTheme API error (${response.status} ${response.statusText}):`, errBody);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const cleaned = cleanJsonString(content);
      const parsed = JSON.parse(cleaned);
      const normalized = normalizeThemeOutput(parsed, promptText);
      const validated = themeConceptInputSchema.safeParse(normalized);

      if (validated.success) {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[GroqClient] Successfully generated AI theme "${normalized.name}" using model ${model}`);
        }
        return validated.data;
      } else {
        console.warn("[GroqClient] Theme validation warning, returning normalized concept:", validated.error.format());
        return normalized;
      }
    } catch (err) {
      console.error("[GroqClient] generateTheme exception:", err);
      return null;
    }
  }

  /**
   * Dynamically resolves the best available vision/multimodal model on the Groq account
   */
  static async resolveVisionModel(apiKey: string): Promise<string> {
    const CANDIDATES = [
      "qwen/qwen3.8-27b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
      "llama-3.2-11b-vision-preview",
      "llama-3.2-90b-vision-preview",
    ];

    try {
      const res = await fetchWithRetryAndTimeout(
        "https://api.groq.com/openai/v1/models",
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
        { timeoutMs: 10000, maxRetries: 2 }
      );
      if (res.ok) {
        const json = await res.json();
        const ids: string[] = (json.data || []).map((m: { id: string }) => m.id);
        for (const candidate of CANDIDATES) {
          if (ids.includes(candidate)) {
            if (process.env.NODE_ENV !== "production") {
              console.info(`[GroqClient] Selected active vision model: "${candidate}"`);
            }
            return candidate;
          }
        }
      }
    } catch (err) {
      console.warn("[GroqClient] Could not fetch vision models:", err);
    }
    return "qwen/qwen3.8-27b";
  }

  /**
   * Extracts vendor name, amounts, and itemization from uploaded invoice/quote using Groq AI
   */
  static async extractDocumentVision(params: {
    fileName: string;
    mimeType: string;
    base64Data: string;
  }): Promise<ExtractedDocumentData | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const visionModel = await this.resolveVisionModel(apiKey);

    const systemPrompt = `You are Planista's Intelligent Document & Expense Extractor.
Inspect the uploaded receipt, invoice, or vendor quote and extract all financial and operational fields into valid JSON:
{
  "vendorName": string, // Name of the vendor / business issuing the document (e.g. "Culinary Delights Catering")
  "vendorEmail": string | null, // Contact email address if found on the document (e.g. "contact@caterer.com" or null)
  "vendorPhone": string | null, // Contact phone or mobile number if found on the document (e.g. "+91 9876543210" or null)
  "amount": number, // Total amount payable or quoted as a positive number (e.g. 8534.00)
  "date": string, // Date on the document in YYYY-MM-DD format (e.g. "2030-01-15")
  "suggestedCategory": string, // One of: "Venue & Rentals", "Catering & Bar", "Photography & Video", "Floral & Decor", "Music & Entertainment", "Stationery & Favors", "Other"
  "documentType": string, // "invoice", "receipt", "quote", or "contract"
  "lineItems": string[], // Itemized descriptions and amounts (e.g. ["Appetizers: ₹1,500", "Main Course: ₹5,000", "Desserts: ₹800", "Tax: ₹584", "Service Charge: ₹500"])
  "uncertainties": string[] // Only note genuine ambiguities. If fields are clearly legible, return empty array []
}

Rules:
- Read and extract the actual text, totals, company name, email address, and phone number directly from the image.
- Look for phone numbers (e.g. Tel, Mob, Phone, +91, 10-digit numbers) and email addresses (containing @) anywhere in the header, footer, or body of the document.
- Never return amount as 0 if a total or subtotal is legible on the image.
- Return ONLY the JSON object.`;

    try {
      const response = await fetchWithRetryAndTimeout(
        GROQ_API_ENDPOINT,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: visionModel,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: systemPrompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${params.mimeType};base64,${params.base64Data}`,
                    },
                  },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        },
        { timeoutMs: 35000, maxRetries: 2 }
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[GroqClient] Vision/Doc API error (${response.status} ${response.statusText}):`, errBody);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const cleaned = cleanJsonString(content);
      const parsed = JSON.parse(cleaned);
      const normalized = normalizeDocumentExtraction(parsed, params.fileName);
      if (process.env.NODE_ENV !== "production") {
        console.info(`[GroqClient] Successfully extracted document using ${visionModel}: "${normalized.vendorName}" ₹${normalized.amount}`);
      }
      return normalized;
    } catch (err) {
      console.error("[GroqClient] extractDocumentVision exception:", err);
      return null;
    }
  }
}
