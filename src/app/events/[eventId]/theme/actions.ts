/**
 * @fileoverview Server Actions for AI Theme Studio.
 * Integrates Groq LLaMA 3.3 theme generation, curated fallback palettes,
 * and tenant-isolated selection.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ThemeDAL, ThemeConceptInput } from "@/lib/dal/theme.dal";
import { EventsDAL } from "@/lib/dal/events.dal";
import { GroqClient } from "@/lib/ai/groq";

/**
 * Designates a specific theme concept as the active palette for an event.
 *
 * @param eventId - Target event UUID.
 * @param themeId - UUID of the theme concept to activate.
 */
export async function selectThemeAction(eventId: string, themeId: string): Promise<void> {
  try {
    await ThemeDAL.selectTheme(eventId, themeId);
    revalidatePath(`/events/${eventId}/theme`);
    revalidatePath(`/events/${eventId}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to select theme";
    redirect(`/events/${eventId}/theme?error=${encodeURIComponent(message)}`);
  }

  redirect(`/events/${eventId}/theme?selected=true`);
}

export async function createOrRefineThemeAction(
  eventId: string,
  formData: FormData
): Promise<void> {
  const prompt = (formData.get("prompt") as string) || "";
  const name = (formData.get("name") as string) || "";

  try {
    const event = await EventsDAL.getEventById(eventId);
    let concept: ThemeConceptInput | null = null;

    if (GroqClient.isConfigured()) {
      try {
        concept = await GroqClient.generateTheme(
          prompt || name || "Atmospheric Celebration",
          event?.event_type || "Celebration"
        );
      } catch {
        // Fall back to curated concept
      }
    }

    if (!concept) {
      concept = ThemeDAL.generateCuratedConcept(
        prompt || name || "Atmospheric Celebration",
        event?.event_type || "Celebration"
      );
    }

    if (name) {
      concept.name = name;
    }

    await ThemeDAL.createTheme(eventId, concept);
    revalidatePath(`/events/${eventId}/theme`);
    revalidatePath(`/events/${eventId}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate theme concept";
    redirect(`/events/${eventId}/theme?error=${encodeURIComponent(message)}`);
  }

  redirect(`/events/${eventId}/theme?saved=true`);
}

export async function deleteThemeAction(eventId: string, themeId: string): Promise<void> {
  try {
    await ThemeDAL.deleteTheme(eventId, themeId);
    revalidatePath(`/events/${eventId}/theme`);
    revalidatePath(`/events/${eventId}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete theme";
    redirect(`/events/${eventId}/theme?error=${encodeURIComponent(message)}`);
  }

  redirect(`/events/${eventId}/theme?deleted=true`);
}
