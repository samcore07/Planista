import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GroqClient } from "@/lib/ai/groq";

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
