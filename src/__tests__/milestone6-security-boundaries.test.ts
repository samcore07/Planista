import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase Server Session
let mockSessionUser: { id: string; email: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  getAuthenticatedUser: vi.fn(async () => mockSessionUser),
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockSessionUser },
        error: mockSessionUser ? null : new Error("Auth session missing"),
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: null, error: null })),
    })),
  })),
}));

// Mock revalidatePath & redirect
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// Import Server Actions
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
  archiveEventAction,
} from "@/app/events/actions";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  applyScheduleShiftAction,
} from "@/app/events/[eventId]/timeline/actions";
import {
  createCategoryAction,
  createExpenseAction,
  deleteExpenseAction,
} from "@/app/events/[eventId]/budget/actions";
import {
  uploadDocumentAction,
  deleteDocumentAction,
} from "@/app/events/[eventId]/scanner/actions";
import {
  sendCopilotMessageAction,
  applyCopilotProposalAction,
} from "@/app/events/[eventId]/copilot/actions";
import {
  createOrRefineThemeAction,
  selectThemeAction,
} from "@/app/events/[eventId]/theme/actions";
import {
  toggleRiskResolvedAction,
  recalculateRisksAction,
} from "@/app/events/[eventId]/risks/actions";

// Import Schema Validators & Upload Boundaries
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/dal/documents.dal";
import { eventBlueprintSchema } from "@/types/blueprint.types";

const TARGET_EVENT_ID = "a0000000-0000-4000-8000-000000000001";
const TARGET_TASK_ID = "a0000000-0000-4000-8000-000000000002";
const TARGET_EXPENSE_ID = "a0000000-0000-4000-8000-000000000003";
const TARGET_DOC_ID = "a0000000-0000-4000-8000-000000000004";
const TARGET_THEME_ID = "a0000000-0000-4000-8000-000000000005";
const TARGET_RISK_ID = "a0000000-0000-4000-8000-000000000006";

describe("Milestone 6: Security Boundaries & Negative Authorization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionUser = null; // Unauthenticated by default
  });

  describe("1. Negative Authorization: Rejecting Unauthenticated Mutations", () => {
    it("createEventAction redirects unauthenticated callers with error=Unauthorized", async () => {
      const formData = new FormData();
      formData.set("title", "Sneak Event");
      formData.set("eventType", "Wedding");

      await expect(createEventAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/events/new?error=Unauthorized"
      );
    });

    it("updateEventAction rejects unauthorized callers", async () => {
      const formData = new FormData();
      formData.set("title", "Hijacked Event");

      await expect(updateEventAction(TARGET_EVENT_ID, formData)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/settings?error=Unauthorized`
      );
    });

    it("deleteEventAction rejects unauthorized callers", async () => {
      await expect(deleteEventAction(TARGET_EVENT_ID)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/settings?error=Unauthorized`
      );
    });

    it("archiveEventAction rejects unauthorized callers", async () => {
      await expect(archiveEventAction(TARGET_EVENT_ID)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/settings?error=Unauthorized`
      );
    });

    it("createTaskAction rejects unauthenticated attempts to alter event schedules", async () => {
      const formData = new FormData();
      formData.set("title", "Unauthorized Task");

      await expect(createTaskAction(TARGET_EVENT_ID, formData)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/timeline?error=Unauthorized`
      );
    });

    it("updateTaskAction and deleteTaskAction reject unauthenticated requests", async () => {
      const formData = new FormData();
      formData.set("title", "Altered Task");

      await expect(updateTaskAction(TARGET_EVENT_ID, TARGET_TASK_ID, formData)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/timeline?error=Unauthorized`
      );
      await expect(deleteTaskAction(TARGET_EVENT_ID, TARGET_TASK_ID)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/timeline?error=Unauthorized`
      );
    });

    it("applyScheduleShiftAction rejects unauthenticated timeline manipulation", async () => {
      await expect(applyScheduleShiftAction(TARGET_EVENT_ID, TARGET_TASK_ID, 7)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/timeline?error=Unauthorized`
      );
    });

    it("Budget ledger mutations reject unauthenticated callers", async () => {
      const catForm = new FormData();
      catForm.set("name", "Fraud Category");
      await expect(createCategoryAction(TARGET_EVENT_ID, catForm)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/budget?error=Unauthorized`
      );

      const expForm = new FormData();
      expForm.set("title", "Fraud Expense");
      await expect(createExpenseAction(TARGET_EVENT_ID, expForm)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/budget?error=Unauthorized`
      );
      await expect(deleteExpenseAction(TARGET_EVENT_ID, TARGET_EXPENSE_ID)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/budget?error=Unauthorized`
      );
    });

    it("Scanner and Document upload reject unauthenticated callers", async () => {
      const docForm = new FormData();
      await expect(uploadDocumentAction(TARGET_EVENT_ID, docForm)).rejects.toThrow(
        `NEXT_REDIRECT:/auth/login?redirectTo=/events/${TARGET_EVENT_ID}/scanner`
      );
      await expect(deleteDocumentAction(TARGET_EVENT_ID, TARGET_DOC_ID)).rejects.toThrow(
        `NEXT_REDIRECT:/auth/login?redirectTo=/events/${TARGET_EVENT_ID}/scanner`
      );
    });

    it("Copilot action execution rejects unauthenticated callers", async () => {
      const sendRes = await sendCopilotMessageAction(TARGET_EVENT_ID, "Cut floral budget");
      expect(sendRes.success).toBe(false);
      expect(sendRes.error).toMatch(/unauthorized/i);

      const applyRes = await applyCopilotProposalAction(TARGET_EVENT_ID, "msg-1", {
        actionType: "adjust_budget",
        summary: "Cut budget",
        explanation: "Reduce budget by 1000",
        financialImpact: { category: "Floral", amountDelta: -1000 },
        tradeOffs: ["Fewer premium flowers"],
      });
      expect(applyRes.success).toBe(false);
      expect(applyRes.error).toMatch(/unauthorized/i);
    });

    it("Theme and Risk operations reject unauthenticated callers", async () => {
      const themeForm = new FormData();
      themeForm.set("prompt", "Gothic Romance");
      await expect(createOrRefineThemeAction(TARGET_EVENT_ID, themeForm)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/theme?error=Unauthorized`
      );
      await expect(selectThemeAction(TARGET_EVENT_ID, TARGET_THEME_ID)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/theme?error=Unauthorized`
      );

      await expect(toggleRiskResolvedAction(TARGET_EVENT_ID, TARGET_RISK_ID, true)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/risks?error=Unauthorized`
      );
      await expect(recalculateRisksAction(TARGET_EVENT_ID)).rejects.toThrow(
        `NEXT_REDIRECT:/events/${TARGET_EVENT_ID}/risks?error=Unauthorized`
      );
    });
  });

  describe("2. Document Scanner Upload Boundary & Payload Validation", () => {
    it("rejects uploads exceeding size boundaries or invalid formats", async () => {
      mockSessionUser = { id: "user-1", email: "planner@planista.app" };

      // Empty file
      const emptyForm = new FormData();
      await expect(uploadDocumentAction(TARGET_EVENT_ID, emptyForm)).rejects.toThrow(
        /NEXT_REDIRECT:.*error=Please%20select%20a%20document%20file/
      );

      // Oversized file simulated via size check
      const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large_invoice.pdf", {
        type: "application/pdf",
      });
      const largeForm = new FormData();
      largeForm.set("file", largeFile);
      await expect(uploadDocumentAction(TARGET_EVENT_ID, largeForm)).rejects.toThrow(
        /NEXT_REDIRECT:.*error=File%20exceeds%20maximum/
      );

      // Disallowed MIME type (executable script)
      const badFile = new File(["alert('malware')"], "payload.html", {
        type: "text/html",
      });
      const badForm = new FormData();
      badForm.set("file", badFile);
      await expect(uploadDocumentAction(TARGET_EVENT_ID, badForm)).rejects.toThrow(
        /NEXT_REDIRECT:.*error=Unsupported%20document%20format/
      );
    });

    it("strictly verifies file boundaries, allowed MIME types and max size constants", () => {
      expect(ALLOWED_MIME_TYPES).toContain("application/pdf");
      expect(ALLOWED_MIME_TYPES).toContain("image/png");
      expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
      expect(ALLOWED_MIME_TYPES).not.toContain("text/html");
      expect(ALLOWED_MIME_TYPES).not.toContain("application/javascript");
      expect(ALLOWED_MIME_TYPES).not.toContain("application/x-msdownload");
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });
  });

  describe("3. Untrusted Input & Prompt Injection Resistance", () => {
    it("parses structured blueprints strictly through Zod, preventing arbitrary script injections", () => {
      const maliciousBlueprint = {
        overview: {
          title: "<script>alert('xss')</script> Spring Gala",
          eventType: "Gala",
          description: "Clean description",
          suggestedTimelineMonths: 6,
          keyThemeSummary: "Earthy Botanical",
          assumptions: ["Outdoor venue permitted"],
          uncertainties: ["Rain contingency"],
        },
        budgetAllocations: [
          {
            category: "Venue",
            percentage: 40,
            suggestedAmount: 40000,
            rationale: "Drop table events; --",
          },
        ],
        tasks: [
          {
            title: "Book Caterer",
            description: "Menu tasting",
            priority: "high" as const,
            relativeDaysBeforeEvent: 90,
            category: "Catering",
            dependsOnTitles: [],
            estimatedDurationHours: 3.5,
          },
        ],
        vendorRequirements: [
          {
            category: "Catering",
            nameRecommendation: "Full Course Farm Caterer",
            estimatedCostRange: { min: 25000, max: 35000 },
            deliverables: ["Plated Dinner", "Table Service"],
            notes: "Organic farm-to-table",
          },
        ],
        theme: {
          themeName: "Botanical Minimalist",
          conceptDescription: "Neutral palette",
          decorDirection: "Earthy",
          lightingDirection: "Warm",
          invitationDirection: "Textured paper",
          palette: [{ name: "Sage", hex: "#8A9A86" }],
        },
        contingencies: [
          {
            riskTitle: "Inclement Weather",
            probability: "medium" as const,
            impact: "high" as const,
            contingencyPlan: "Reserve marquee tent",
          },
        ],
      };

      const parsed = eventBlueprintSchema.safeParse(maliciousBlueprint);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        // Data is treated purely as strings, not executed as SQL or DOM scripts
        expect(parsed.data.overview.title).toContain("<script>");
        expect(parsed.data.budgetAllocations[0]?.rationale).toContain("Drop table");
      }
    });

    it("rejects corrupted AI blueprints with invalid percentage allocations or negative numbers", () => {
      const invalidBlueprint = {
        overview: {
          title: "W", // Less than 3 characters (violates min(3))
          eventType: "E",
          description: "Description",
          suggestedTimelineMonths: -2, // Negative months invalid
          keyThemeSummary: "Theme",
          assumptions: [],
          uncertainties: [],
        },
        budgetAllocations: [
          {
            category: "Venue",
            percentage: 150, // Exceeds max 100%
            suggestedAmount: -500, // Negative amount invalid
            rationale: "Rationale",
          },
        ],
        tasks: [],
        vendorRequirements: [],
        theme: {
          themeName: "Default",
          conceptDescription: "Concept",
          palette: [{ name: "BadHex", hex: "not-a-hex" }], // Violates regex /^#[0-9A-Fa-f]{6}$/
          decorDirection: "Decor",
          lightingDirection: "Lighting",
          invitationDirection: "Invites",
        },
        contingencies: [],
      };

      const parsed = eventBlueprintSchema.safeParse(invalidBlueprint);
      expect(parsed.success).toBe(false);
    });
  });
});
