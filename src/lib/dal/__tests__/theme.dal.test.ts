import { describe, it, expect } from "vitest";
import { themeConceptInputSchema, ThemeDAL } from "../theme.dal";

describe("Theme Studio & Concept Synthesis", () => {
  it("validates theme concept schema with hex colors and styling parameters", () => {
    const valid = {
      name: "Tuscan Sunset",
      description: "Terracotta warmth with olive branch accents and dusk lighting.",
      colorPalette: [
        { name: "Terracotta", hex: "#E2725B" },
        { name: "Olive Green", hex: "#556B2F" },
        { name: "Warm Ochre", hex: "#CC7722" },
      ],
      decorDirection: "Earthen vessels and linen table runners",
      lightingStyling: "Low amber pendant lamps",
    };

    const result = themeConceptInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("strictly rejects malformed hex color codes", () => {
    const invalidHex = {
      name: "Broken Theme",
      description: "Invalid colors",
      colorPalette: [
        { name: "Bad Color", hex: "not-a-hex" },
        { name: "Short Hex", hex: "#FFF" },
      ],
    };

    const result = themeConceptInputSchema.safeParse(invalidHex);
    expect(result.success).toBe(false);
  });

  it("labels fallback moodboard assets honestly as not AI generated", () => {
    const coastalConcept = ThemeDAL.generateCuratedConcept("Coastal ocean breeze", "Wedding");

    expect(coastalConcept.name).toContain("Coastal");
    expect(coastalConcept.colorPalette.length).toBeGreaterThanOrEqual(4);
    expect(coastalConcept.moodboardUrls.length).toBeGreaterThan(0);

    for (const moodboard of coastalConcept.moodboardUrls) {
      expect(moodboard.isAiGenerated).toBe(false);
      expect(moodboard.label).toContain("Curated Fallback");
    }
  });

  it("synthesizes celestial theme when prompted with midnight or stars", () => {
    const celestialConcept = ThemeDAL.generateCuratedConcept("Midnight stars and gold", "Gala");

    expect(celestialConcept.name).toContain("Celestial");
    expect(celestialConcept.colorPalette.some((p) => p.name.includes("Navy") || p.name.includes("Gold"))).toBe(true);
  });
});
