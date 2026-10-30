/**
 * @fileoverview Data Access Layer (DAL) for Event Theme Concepts and Aesthetic Palettes.
 * Provides tenant-isolated management of color palettes, decor directions, lighting cues,
 * and moodboard asset URLs with strict Zod validation.
 */

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { type Database, type Json } from "@/types/database.types";
import { z } from "zod";

export type ThemeRow = Database["public"]["Tables"]["theme_concepts"]["Row"];

/**
 * Validation schema for theme concept generation and persistence.
 */
export const themeConceptInputSchema = z.object({
  name: z.string().min(2, "Theme name must be at least 2 characters"),
  description: z.string().min(5, "Description is required"),
  colorPalette: z.array(
    z.object({
      name: z.string(),
      hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    })
  ).min(2),
  decorDirection: z.string().optional(),
  lightingStyling: z.string().optional(),
  floralIdeas: z.string().optional(),
  invitationDirection: z.string().optional(),
  moodboardUrls: z.array(
    z.object({
      url: z.string(),
      label: z.string(),
      isAiGenerated: z.boolean(),
    })
  ).default([]),
  isSelected: z.boolean().default(false),
});

export type ThemeConceptInput = z.infer<typeof themeConceptInputSchema>;

/**
 * Data Access Layer for event aesthetic themes and color palettes.
 */
export class ThemeDAL {
  /**
   * Retrieves all aesthetic theme concepts created for an event.
   *
   * @param eventId - Target event UUID.
   * @returns Array of theme concept rows.
   */
  static async getThemes(eventId: string): Promise<ThemeRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("theme_concepts")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch themes: ${error.message}`);
    return data || [];
  }

  /**
   * Designates a specific theme as the active primary theme, unselecting all others for the event.
   *
   * @param eventId - Target event UUID.
   * @param themeId - UUID of the theme concept to activate.
   */
  static async selectTheme(eventId: string, themeId: string): Promise<void> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();

    // 1. Deselect all other themes for this event
    await supabase
      .from("theme_concepts")
      .update({ is_selected: false })
      .eq("event_id", eventId);

    // 2. Select targeted theme
    const { error } = await supabase
      .from("theme_concepts")
      .update({ is_selected: true })
      .eq("id", themeId)
      .eq("event_id", eventId);

    if (error) throw new Error(`Failed to select theme: ${error.message}`);
  }

  static async createTheme(eventId: string, rawInput: ThemeConceptInput): Promise<ThemeRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = themeConceptInputSchema.parse(rawInput);
    const supabase = await createClient();

    // If new theme is marked selected, deselect others
    if (input.isSelected) {
      await supabase
        .from("theme_concepts")
        .update({ is_selected: false })
        .eq("event_id", eventId);
    }

    const { data, error } = await supabase
      .from("theme_concepts")
      .insert({
        event_id: eventId,
        name: input.name,
        description: input.description,
        color_palette: input.colorPalette as unknown as Json,
        decor_direction: input.decorDirection ?? null,
        lighting_styling: input.lightingStyling ?? null,
        floral_ideas: input.floralIdeas ?? null,
        invitation_direction: input.invitationDirection ?? null,
        moodboard_urls: input.moodboardUrls as unknown as Json,
        is_selected: input.isSelected,
      })
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to create theme: ${error?.message}`);
    return data;
  }

  static async deleteTheme(eventId: string, themeId: string): Promise<boolean> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { error } = await supabase
      .from("theme_concepts")
      .delete()
      .eq("id", themeId)
      .eq("event_id", eventId);

    if (error) throw new Error(`Failed to delete theme: ${error.message}`);
    return true;
  }

  /**
   * Deterministically synthesizes or refines a theme concept with transparent asset labeling
   */
  static generateCuratedConcept(promptText: string, eventType: string = "Celebration"): ThemeConceptInput {
    const lower = promptText.toLowerCase();

    if (lower.includes("coastal") || lower.includes("ocean") || lower.includes("beach")) {
      return {
        name: "Coastal Dune & Sea Glass",
        description: "Wind-swept natural linens, bleached driftwood textures, and muted sea glass accents.",
        colorPalette: [
          { name: "Sea Glass Teal", hex: "#4A7C7A" },
          { name: "Driftwood Sand", hex: "#D6C7B2" },
          { name: "Ocean Foam", hex: "#EAF2F1" },
          { name: "Deep Navy Indigo", hex: "#1B2A4A" },
        ],
        decorDirection: "Washed sheer drapery, weathered neutral wood tables, and subtle textured pottery.",
        lightingStyling: "Breeze-shielded hurricane glass lanterns, fairy string canopies, and warm 2400K illumination.",
        floralIdeas: "White garden roses, dried pampas grasses, sea holly thistle, and trailing eucalyptus.",
        invitationDirection: "Torn-edge deckled handmade cotton paper with blind deboss ocean contours.",
        moodboardUrls: [
          {
            url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'><rect width='400' height='240' fill='%234A7C7A'/><circle cx='200' cy='120' r='80' fill='%23D6C7B2' opacity='0.7'/></svg>",
            label: "Coastal Dune Color Study (Curated Fallback Palette)",
            isAiGenerated: false,
          },
        ],
        isSelected: false,
      };
    }

    if (lower.includes("celestial") || lower.includes("midnight") || lower.includes("galaxy") || lower.includes("star")) {
      return {
        name: "Midnight Celestial & Star Dust",
        description: "Moody astronomical glamour with midnight velvet, constellation accents, and antique brushed brass.",
        colorPalette: [
          { name: "Midnight Navy", hex: "#0B132B" },
          { name: "Burnished Gold", hex: "#D4AF37" },
          { name: "Star Platinum", hex: "#E0E1DD" },
          { name: "Smoky Quartz", hex: "#3A3238" },
        ],
        decorDirection: "Deep obsidian chargers, star-chart table numbers, and celestial patterned velvet runners.",
        lightingStyling: "Fiber-optic star-field canopy ceiling, pinpoint spotlighting, and dark amber taper candles.",
        floralIdeas: "Deep black baccara roses, dark plum dahlias, thistle, and gold-dusted ruscus sprigs.",
        invitationDirection: "Black cardstock foil-stamped with holographic constellations and gold metallic ink.",
        moodboardUrls: [
          {
            url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'><rect width='400' height='240' fill='%230B132B'/><circle cx='200' cy='120' r='60' fill='%23D4AF37' opacity='0.8'/></svg>",
            label: "Midnight Celestial Swatch (Curated Fallback Palette)",
            isAiGenerated: false,
          },
        ],
        isSelected: false,
      };
    }

    // Default warm botanical concept
    return {
      name: "Warm Editorial Botanical",
      description: `Contemporary architectural styling with organic greenery, ivory stoneware, and warm brass accents for ${eventType}.`,
      colorPalette: [
        { name: "Forest Emerald", hex: "#1C3829" },
        { name: "Warm Alabaster", hex: "#F7F5F0" },
        { name: "Soft Sage", hex: "#8DAA91" },
        { name: "Antique Brass", hex: "#C5A059" },
      ],
      decorDirection: "Floor-to-ceiling olive leaf runners, matte black metal accents, and tactile stone vessels.",
      lightingStyling: "Warm 2700K architectural uplighting, dimmable dining pin-spots, and organic cluster votives.",
      floralIdeas: "White ranunculus, olive foliage, gardenias, and flowering jasmine vines.",
      invitationDirection: "Letterpress serif type on 600gsm cotton stock with blind embossed leaf motifs.",
      moodboardUrls: [
        {
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'><rect width='400' height='240' fill='%231C3829'/><circle cx='200' cy='120' r='70' fill='%238DAA91' opacity='0.8'/></svg>",
          label: "Botanical Palette Study (Curated Fallback Asset)",
          isAiGenerated: false,
        },
      ],
      isSelected: false,
    };
  }
}
