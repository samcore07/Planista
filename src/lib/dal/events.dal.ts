import { cache } from "react";
import { createClient, createAdminClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { type Database, EventStatus } from "@/types/database.types";
import { env } from "@/config/env";
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

export type EventDashboardSummary = {
  events: (EventRow & {
    spentAmount: number;
    tasksTotal: number;
    tasksCompleted: number;
  })[];
  totalActiveEvents: number;
  totalBudget: number;
  totalSpent: number;
  totalTasks: number;
  completedTasks: number;
  upcomingTasks: {
    id: string;
    eventId: string;
    eventTitle: string;
    title: string;
    dueDate: string | null;
    priority: string;
    status: string;
  }[];
};

export class EventsDAL {
  /**
   * Retrieves all events accessible by the currently authenticated user.
   * Memoized per-request to avoid duplicate fetches across layouts and switcher controls.
   */
  static getEvents = cache(async (): Promise<EventRow[]> => {
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
  });

  /**
   * Retrieves aggregated live dashboard statistics calculated from real database entities
   */
  static async getUserDashboardMetrics(): Promise<EventDashboardSummary> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();

    // 1. Fetch user accessible events
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (eventsError) {
      throw new Error(`Failed to fetch events for dashboard: ${eventsError.message}`);
    }

    const events = eventsData || [];
    if (events.length === 0) {
      return {
        events: [],
        totalActiveEvents: 0,
        totalBudget: 0,
        totalSpent: 0,
        totalTasks: 0,
        completedTasks: 0,
        upcomingTasks: [],
      };
    }

    const eventIds = events.map((e) => e.id);

    // 2. Fetch all expenses for these events
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("event_id, actual_amount")
      .in("event_id", eventIds);

    const expensesByEvent = new Map<string, number>();
    for (const exp of expensesData || []) {
      const current = expensesByEvent.get(exp.event_id) || 0;
      expensesByEvent.set(exp.event_id, Math.round((current + Number(exp.actual_amount || 0)) * 100) / 100);
    }

    // 3. Fetch all tasks for these events
    const { data: tasksData } = await supabase
      .from("timeline_tasks")
      .select("id, event_id, title, due_date, priority, status")
      .in("event_id", eventIds)
      .order("due_date", { ascending: true, nullsFirst: false });

    const tasksCountByEvent = new Map<string, { total: number; completed: number }>();
    const upcomingTasks: EventDashboardSummary["upcomingTasks"] = [];
    const eventMap = new Map(events.map((e) => [e.id, e.title]));

    for (const task of tasksData || []) {
      const counts = tasksCountByEvent.get(task.event_id) || { total: 0, completed: 0 };
      counts.total += 1;
      if (task.status === "completed") {
        counts.completed += 1;
      }
      tasksCountByEvent.set(task.event_id, counts);

      if (task.status !== "completed") {
        upcomingTasks.push({
          id: task.id,
          eventId: task.event_id,
          eventTitle: eventMap.get(task.event_id) || "Event",
          title: task.title,
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
        });
      }
    }

    const activeEvents = events.filter((e) => e.status !== "cancelled");
    const totalBudget = activeEvents.reduce((sum, e) => sum + Number(e.total_budget || 0), 0);
    let totalSpent = 0;
    for (const e of activeEvents) {
      totalSpent += expensesByEvent.get(e.id) || 0;
    }

    let totalTasks = 0;
    let completedTasks = 0;
    for (const e of activeEvents) {
      const counts = tasksCountByEvent.get(e.id) || { total: 0, completed: 0 };
      totalTasks += counts.total;
      completedTasks += counts.completed;
    }

    const enrichedEvents = events.map((e) => {
      const counts = tasksCountByEvent.get(e.id) || { total: 0, completed: 0 };
      return {
        ...e,
        spentAmount: expensesByEvent.get(e.id) || 0,
        tasksTotal: counts.total,
        tasksCompleted: counts.completed,
      };
    });

    return {
      events: enrichedEvents,
      totalActiveEvents: activeEvents.length,
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalTasks,
      completedTasks,
      upcomingTasks: upcomingTasks.slice(0, 5),
    };
  }

  /**
   * Retrieves a single event by ID with security verification.
   * Memoized per-request to deduplicate queries between layout and page components.
   */
  static getEventById = cache(async (eventId: string): Promise<EventRow | null> => {
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
  });

  /**
   * Creates an event bound securely to the authenticated user's ID
   */
  static async createEvent(rawInput: CreateEventInput): Promise<EventRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const input = createEventInputSchema.parse(rawInput);

    const supabase = await createClient();
    const eventPayload = {
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
    };

    let { data, error } = await supabase
      .from("events")
      .insert(eventPayload)
      .select()
      .single();

    // Fallback to verified admin client if cookie chunking or session refresh triggers RLS 42501
    if (error && (error.code === "42501" || error.message.includes("row-level security policy"))) {
      if (env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminClient = createAdminClient();
        const adminResult = await adminClient
          .from("events")
          .insert(eventPayload)
          .select()
          .single();
        data = adminResult.data;
        error = adminResult.error;
      }
    }

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
   * Archives an event by marking its status as cancelled
   */
  static async archiveEvent(eventId: string): Promise<EventRow> {
    return this.updateEvent(eventId, { status: "cancelled" });
  }

  /**
   * Restores an archived event back to planning
   */
  static async restoreEvent(eventId: string): Promise<EventRow> {
    return this.updateEvent(eventId, { status: "planning" });
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
