import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate } from "../utils";

describe("Utility functions", () => {
  it("merges class names correctly with cn()", () => {
    const result = cn("text-red-500", "p-4", { "bg-blue-500": true, "hidden": false });
    expect(result).toContain("text-red-500");
    expect(result).toContain("p-4");
    expect(result).toContain("bg-blue-500");
    expect(result).not.toContain("hidden");
  });

  it("handles tailwind class conflicts with twMerge", () => {
    const result = cn("p-2", "p-4");
    expect(result).toBe("p-4");
  });

  it("formats currency correctly", () => {
    const usd = formatCurrency(25000, "USD");
    expect(usd).toMatch(/\$25,000/);

    const eur = formatCurrency(1500, "EUR");
    expect(eur).toContain("1,500");
  });

  it("formats date strings into readable format", () => {
    const formatted = formatDate("2026-10-27T00:00:00Z");
    expect(formatted).toMatch(/Oct 27, 2026/);
  });
});
