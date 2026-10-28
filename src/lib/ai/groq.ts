import { env } from "@/config/env";
import {
  eventBlueprintSchema,
  EventBlueprint,
} from "@/types/blueprint.types";
import { BlueprintGenerationInput, CopilotActionProposal } from "@/lib/ai/provider";
import { ThemeConceptInput, themeConceptInputSchema } from "@/lib/dal/theme.dal";
import { ExtractedDocumentData } from "@/lib/dal/documents.dal";

const GROQ_API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "llama-3.2-11b-vision-preview";

export class GroqClient {
  static getApiKey(): string | undefined {
    return process.env.GROQ_API_KEY || env.GROQ_API_KEY;
  }

  static isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && !key.includes("placeholder") && key.trim().length > 10;
  }

  /**
   * Generates a comprehensive, schema-validated event blueprint using Groq Llama 3.3 70B
   */
  static async generateBlueprint(input: BlueprintGenerationInput): Promise<EventBlueprint | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

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
      "dependsOnTitles": string[]
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
3. Provide 6 to 10 chronologically organized milestone checklist tasks with realistic T-X day values and logical dependencies.
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
      const response = await fetch(GROQ_API_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      const validated = eventBlueprintSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }

      return null;
    } catch {
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
      const response = await fetch(GROQ_API_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      return {
        reply: parsed.reply || "I reviewed your event context and updated the planning recommendations.",
        proposal: parsed.proposal || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generates a creative bespoke theme concept using Groq Llama 3.3 70B
   */
  static async generateTheme(promptText: string, eventType: string = "Celebration"): Promise<ThemeConceptInput | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

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
      const response = await fetch(GROQ_API_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Event Type: ${eventType}\nTheme Prompt: ${promptText}` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      const validated = themeConceptInputSchema.safeParse({
        ...parsed,
        moodboardUrls: [],
        isSelected: false,
      });

      if (validated.success) {
        return validated.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extracts vendor name, amounts, and itemization from uploaded invoice/quote using Groq Llama 3.2 Vision
   */
  static async extractDocumentVision(params: {
    fileName: string;
    mimeType: string;
    base64Data: string;
  }): Promise<ExtractedDocumentData | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const systemPrompt = `You are Planista's Intelligent Document & Expense Extractor.
Inspect the uploaded receipt, invoice, or vendor quote and extract all financial and operational fields into valid JSON:
{
  "vendorName": string,
  "amount": number (total payable or quoted amount as a positive number),
  "date": string (ISO YYYY-MM-DD or empty string),
  "suggestedCategory": string ("Venue & Rentals" | "Catering & Bar" | "Photography & Video" | "Floral & Decor" | "Music & Entertainment" | "Stationery & Favors" | "Other"),
  "documentType": "invoice" | "receipt" | "quote" | "contract",
  "lineItems": string[] (array of itemized line items with amounts if visible),
  "uncertainties": string[] (any ambiguous or unverified details)
}

Rules:
- Extract the exact numerical total from the document.
- Never invent facts: if an amount or vendor name is unreadable, note it under uncertainties.
- Return ONLY the JSON object.`;

    try {
      const response = await fetch(GROQ_API_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: VISION_MODEL,
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
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      return {
        vendorName: parsed.vendorName || "Vendor Partner",
        amount: Number(parsed.amount) || 0,
        date: parsed.date || new Date().toISOString().split("T")[0],
        suggestedCategory: parsed.suggestedCategory || "Venue & Rentals",
        documentType: parsed.documentType || "quote",
        lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
        uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
        isOcrAvailable: true,
      };
    } catch {
      return null;
    }
  }
}
