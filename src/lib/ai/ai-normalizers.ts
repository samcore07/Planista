/**
 * @fileoverview Pure Data Normalization and Schema Validation for Generative AI Model Outputs.
 * Decouples JSON sanitization, color palette normalization, and schema conformance from network client I/O.
 */

import {
  EventBlueprint,
  recommendProcessHours,
} from "@/types/blueprint.types";
import { BlueprintGenerationInput, CopilotActionProposal } from "@/lib/ai/provider";
import { ThemeConceptInput } from "@/lib/dal/theme.dal";
import { ExtractedDocumentData } from "@/lib/dal/documents.dal";

export { recommendProcessHours };

type RecordUnknown = Record<string, unknown>;

function toRecord(val: unknown): RecordUnknown {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as RecordUnknown;
  }
  return {};
}

/**
 * Strips markdown code block wrappers from LLM string output in linear time without backtracking regex.
 *
 * @param raw - Raw string output from LLM.
 * @returns Cleaned JSON substring ready for JSON.parse.
 */
export function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\r?\n?/, "");
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence !== -1) {
      cleaned = cleaned.slice(0, lastFence);
    }
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

/**
 * Sanitizes any color string into a strict 6-digit hex format (#RRGGBB).
 * Supports named CSS colors, 3-digit hex, and 8-digit hex inputs.
 *
 * @param color - Raw color token or name.
 * @param fallback - Fallback 6-digit hex color if unparseable.
 * @returns Strict uppercase hex color string.
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
 * Normalizes raw LLM output into strict schema-compliant EventBlueprint.
 *
 * @param raw - Parsed JSON object from model.
 * @param input - Original blueprint brief for fallback parameters.
 * @returns Fully validated and normalized EventBlueprint.
 */
export function normalizeBlueprintOutput(raw: unknown, input: BlueprintGenerationInput): EventBlueprint {
  const root = toRecord(raw);
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
 * Normalizes raw LLM output into strict schema-compliant ThemeConceptInput.
 *
 * @param raw - Raw model response.
 * @param fallbackName - Default concept name.
 * @returns Fully validated ThemeConceptInput.
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
 * Normalizes raw LLM output into strict schema-compliant Copilot response & proposal.
 *
 * @param raw - Raw model response.
 * @returns Clean reply text and optional structured action proposal.
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
 * Normalizes raw LLM vision extraction into ExtractedDocumentData.
 *
 * @param raw - Model OCR JSON response.
 * @param fileName - File name for fallback naming.
 * @returns Fully validated ExtractedDocumentData structure.
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
