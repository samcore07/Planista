import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { type Database, EventStatus } from "@/types/database.types";
import { z } from "zod";

export const createEventInputSchema = z.object({
  title: z.string().min(2, "Event title must be at least 2 characters").trim(),
  eventType: z.string().min(2, "Event type is required").trim(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  location: z.string().optional(),
  guestCount: z.number().int().min(0).default(0),
  totalBudget: z.number().min(0).default(0),
  currency: z.string().length(3).default("USD"),
});

export const updateEventInputSchema = createEventInputSchema.partial().extend({
  status: z.enum(["draft", "planning", "confirmed", "completed", "cancelled"]).optional(),
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;
export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;
export type EventRow = Database["public"]["Tables"]["events"]["Row"];

export class EventsDAL {
  /**
   * Retrieves all events accessible by the currently authenticated user
   */
  static async getEvents(): Promise<EventRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Retrieves a single event by ID with security verification
   */
  static async getEventById(eventId: string): Promise<EventRow | null> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Creates an event bound securely to the authenticated user's ID
   */
  static async createEvent(rawInput: CreateEventInput): Promise<EventRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = createEventInputSchema.parse(rawInput);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id, // Strictly derived from server session, never browser
        title: input.title,
        event_type: input.eventType,
        description: input.description ?? null,
        event_date: input.eventDate ?? null,
        location: input.location ?? null,
        guest_count: input.guestCount,
        total_budget: input.totalBudget,
        currency: input.currency,
        status: "planning" as EventStatus,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create event: ${error?.message || "Unknown database error"}`);
    }

    return data;
  }

  /**
   * Updates an existing event with verified ownership/membership
   */
  static async updateEvent(eventId: string, rawInput: UpdateEventInput): Promise<EventRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = updateEventInputSchema.parse(rawInput);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .update({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.eventType !== undefined && { event_type: input.eventType }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.eventDate !== undefined && { event_date: input.eventDate }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.guestCount !== undefined && { guest_count: input.guestCount }),
        ...(input.totalBudget !== undefined && { total_budget: input.totalBudget }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.status !== undefined && { status: input.status }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update event: ${error?.message || "Event not found or forbidden"}`);
    }

    return data;
  }

  /**
   * Deletes an event (owner-only operation enforced by RLS)
   */
  static async deleteEvent(eventId: string): Promise<boolean> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }

    return true;
  }
}
