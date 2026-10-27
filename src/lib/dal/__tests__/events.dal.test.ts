import { describe, it, expect } from "vitest";
import {
  createEventInputSchema,
  updateEventInputSchema,
} from "../events.dal";

describe("Events DAL Schemas and Validation", () => {
  it("successfully validates standard event creation input", () => {
    const input = {
      title: "Golden Jubilee Anniversary",
      eventType: "Anniversary",
      description: "50th wedding anniversary celebration",
      guestCount: 150,
      totalBudget: 45000,
      currency: "USD",
      location: "San Francisco City Hall",
    };

    const result = createEventInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Golden Jubilee Anniversary");
      expect(result.data.guestCount).toBe(150);
      expect(result.data.currency).toBe("USD");
    }
  });

  it("applies defaults for currency and guest counts", () => {
    const input = {
      title: "Community Meetup",
      eventType: "Meetup",
    };

    const result = createEventInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestCount).toBe(0);
      expect(result.data.totalBudget).toBe(0);
      expect(result.data.currency).toBe("USD");
    }
  });

  it("rejects invalid negative numbers or short titles", () => {
    const shortTitle = {
      title: "A",
      eventType: "Party",
    };
    expect(createEventInputSchema.safeParse(shortTitle).success).toBe(false);

    const negativeGuests = {
      title: "Birthday Bash",
      eventType: "Birthday",
      guestCount: -5,
    };
    expect(createEventInputSchema.safeParse(negativeGuests).success).toBe(false);

    const negativeBudget = {
      title: "Birthday Bash",
      eventType: "Birthday",
      totalBudget: -100,
    };
    expect(createEventInputSchema.safeParse(negativeBudget).success).toBe(false);
  });

  it("validates event status transitions for update schema", () => {
    const validStatuses = ["draft", "planning", "confirmed", "completed", "cancelled"] as const;

    for (const status of validStatuses) {
      const result = updateEventInputSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }

    const invalidStatus = { status: "unknown_status" };
    expect(updateEventInputSchema.safeParse(invalidStatus).success).toBe(false);
  });
});
