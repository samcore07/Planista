import { env } from "@/config/env";
import { fetchWithRetryAndTimeout } from "@/lib/reliability/fetch-retry";
import {
  eventBlueprintSchema,
  EventBlueprint,
} from "@/types/blueprint.types";
import { BlueprintGenerationInput, CopilotActionProposal } from "@/lib/ai/provider";
import { ThemeConceptInput, themeConceptInputSchema } from "@/lib/dal/theme.dal";
import { ExtractedDocumentData } from "@/lib/dal/documents.dal";

export {
  recommendProcessHours,
  cleanJsonString,
  sanitizeHexColor,
  normalizeBlueprintOutput,
  normalizeThemeOutput,
  normalizeCopilotOutput,
  normalizeDocumentExtraction,
} from "./ai-normalizers";
import {
  cleanJsonString,
  normalizeBlueprintOutput,
  normalizeThemeOutput,
  normalizeCopilotOutput,
  normalizeDocumentExtraction,
} from "./ai-normalizers";

const GROQ_API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

let cachedTextModel: string | null = null;





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
