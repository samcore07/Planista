import { describe, it, expect } from "vitest";
import { copilotActionProposalSchema } from "../copilot.dal";

describe("Copilot Action Pipeline & Schemas", () => {
  it("validates structured budget adjustment proposal with financial impact and trade-offs", () => {
    const valid = {
      actionType: "adjust_budget" as const,
      summary: "Reduce floral budget by $1,000",
      explanation: "Shifting to seasonal foliage centerpieces to preserve contingency reserve.",
      financialImpact: {
        category: "Floral & Decor",
        amountDelta: -1000,
      },
      tradeOffs: [
        "Limits imported rare florals",
        "Preserves catering and venue allocations untouched",
      ],
    };

    const result = copilotActionProposalSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType).toBe("adjust_budget");
      expect(result.data.financialImpact?.amountDelta).toBe(-1000);
      expect(result.data.tradeOffs.length).toBe(2);
    }
  });

  it("validates structured schedule reschedule proposal", () => {
    const valid = {
      actionType: "reschedule_task" as const,
      summary: "Delay contract signoff by 7 days",
      explanation: "Vendor contract negotiation requires additional legal review.",
      scheduleImpact: {
        taskId: "task_123",
        proposedDate: "2026-11-20T00:00:00Z",
      },
      tradeOffs: ["Shortens deposit buffer before final load-in"],
    };

    const result = copilotActionProposalSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("strictly rejects proposals with unrecognized action types or raw code", () => {
    const invalid = {
      actionType: "execute_sql_query",
      summary: "Raw query",
      explanation: "SELECT * FROM users",
    };

    const result = copilotActionProposalSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
