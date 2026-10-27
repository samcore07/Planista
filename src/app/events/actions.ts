"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EventsDAL, createEventInputSchema, updateEventInputSchema } from "@/lib/dal/events.dal";

export async function createEventAction(formData: FormData): Promise<void> {
  const title = formData.get("title") as string;
  const eventType = formData.get("eventType") as string;
  const description = (formData.get("description") as string) || undefined;
  const eventDate = (formData.get("eventDate") as string) || undefined;
  const location = (formData.get("location") as string) || undefined;
  const guestCount = Number(formData.get("guestCount") || 0);
  const totalBudget = Number(formData.get("totalBudget") || 0);
  const currency = (formData.get("currency") as string) || "USD";

  const parsed = createEventInputSchema.safeParse({
    title,
    eventType,
    description,
    eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
    location,
    guestCount,
    totalBudget,
    currency,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid input parameters";
    redirect(`/events/new?error=${encodeURIComponent(errorMsg)}`);
  }

  let createdId: string;
  try {
    const event = await EventsDAL.createEvent(parsed.data);
    createdId = event.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create event";
    redirect(`/events/new?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard");
  redirect(`/events/${createdId}`);
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<void> {
  const title = (formData.get("title") as string) || undefined;
  const eventType = (formData.get("eventType") as string) || undefined;
  const description = (formData.get("description") as string) || undefined;
  const eventDate = (formData.get("eventDate") as string) || undefined;
  const location = (formData.get("location") as string) || undefined;
  const guestCountRaw = formData.get("guestCount");
  const totalBudgetRaw = formData.get("totalBudget");
  const currency = (formData.get("currency") as string) || undefined;
  const status = (formData.get("status") as "draft" | "planning" | "confirmed" | "completed" | "cancelled") || undefined;

  const parsed = updateEventInputSchema.safeParse({
    title,
    eventType,
    description,
    eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
    location,
    guestCount: guestCountRaw !== null ? Number(guestCountRaw) : undefined,
    totalBudget: totalBudgetRaw !== null ? Number(totalBudgetRaw) : undefined,
    currency,
    status,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid input parameters";
    redirect(`/events/${eventId}/settings?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    await EventsDAL.updateEvent(eventId, parsed.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update event";
    redirect(`/events/${eventId}/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/settings`);
  redirect(`/events/${eventId}/settings?saved=true`);
}

export async function archiveEventAction(eventId: string): Promise<void> {
  try {
    await EventsDAL.archiveEvent(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to archive event";
    redirect(`/events/${eventId}/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/events/${eventId}`);
  redirect("/dashboard");
}

export async function restoreEventAction(eventId: string): Promise<void> {
  try {
    await EventsDAL.restoreEvent(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to restore event";
    redirect(`/events/${eventId}/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}/settings?restored=true`);
}

export async function deleteEventAction(eventId: string): Promise<void> {
  try {
    await EventsDAL.deleteEvent(eventId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete event";
    redirect(`/events/${eventId}/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
