"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ThemeDAL } from "@/lib/dal/theme.dal";
import { EventsDAL } from "@/lib/dal/events.dal";

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
    const concept = ThemeDAL.generateCuratedConcept(
      prompt || name || "Atmospheric Celebration",
      event?.event_type || "Celebration"
    );

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
