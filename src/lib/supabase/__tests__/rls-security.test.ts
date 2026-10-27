import { describe, it, expect } from "vitest";

interface SecurityContext {
  userId: string | null;
  role: "authenticated" | "anon";
}

interface MockEvent {
  id: string;
  user_id: string;
  title: string;
  total_budget: number;
}

interface MockCollaborator {
  event_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
}

/**
 * Deterministic simulator of PostgreSQL Row Level Security (RLS) policies
 * defined in supabase/migrations/20261027000001_create_schema.sql.
 */
class RlsPolicyEngine {
  private events: MockEvent[] = [];
  private collaborators: MockCollaborator[] = [];

  constructor(initialEvents: MockEvent[], initialCollaborators: MockCollaborator[] = []) {
    this.events = initialEvents;
    this.collaborators = initialCollaborators;
  }

  // Corresponds to public.has_event_access(event_id, auth.uid())
  hasEventAccess(eventId: string, context: SecurityContext): boolean {
    if (!context.userId) return false;
    const isOwner = this.events.some((e) => e.id === eventId && e.user_id === context.userId);
    if (isOwner) return true;
    return this.collaborators.some((c) => c.event_id === eventId && c.user_id === context.userId);
  }

  // Corresponds to CREATE POLICY "Events select policy" ON public.events FOR SELECT USING (has_event_access(id, auth.uid()))
  selectEvents(context: SecurityContext): MockEvent[] {
    return this.events.filter((event) => this.hasEventAccess(event.id, context));
  }

  // Corresponds to CREATE POLICY "Events insert policy" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id)
  insertEvent(event: MockEvent, context: SecurityContext): { success: boolean; error?: string } {
    if (!context.userId) {
      return { success: false, error: "Unauthorized: Missing session" };
    }
    if (event.user_id !== context.userId) {
      return {
        success: false,
        error: "Forbidden: Cannot create event on behalf of another user identity (RLS check failed)",
      };
    }
    this.events.push(event);
    return { success: true };
  }

  // Corresponds to CREATE POLICY "Events update policy" ON public.events FOR UPDATE USING (has_event_access(id, auth.uid()))
  updateEvent(
    eventId: string,
    updates: Partial<MockEvent>,
    context: SecurityContext
  ): { success: boolean; error?: string } {
    if (!this.hasEventAccess(eventId, context)) {
      return { success: false, error: "Unauthorized: Event not found or access denied" };
    }
    const idx = this.events.findIndex((e) => e.id === eventId);
    if (idx === -1) return { success: false, error: "Event not found" };

    this.events[idx] = { ...this.events[idx], ...updates };
    return { success: true };
  }

  // Corresponds to CREATE POLICY "Events delete policy" ON public.events FOR DELETE USING (auth.uid() = user_id)
  deleteEvent(eventId: string, context: SecurityContext): { success: boolean; error?: string } {
    if (!context.userId) {
      return { success: false, error: "Unauthorized" };
    }
    const target = this.events.find((e) => e.id === eventId);
    if (!target || target.user_id !== context.userId) {
      return { success: false, error: "Forbidden: Only event owners can delete events" };
    }
    this.events = this.events.filter((e) => e.id !== eventId);
    return { success: true };
  }
}

describe("Row Level Security & Tenant Isolation Tests", () => {
  const userA: SecurityContext = { userId: "user-uuid-1111", role: "authenticated" };
  const userB: SecurityContext = { userId: "user-uuid-2222", role: "authenticated" };
  const anonUser: SecurityContext = { userId: null, role: "anon" };

  const eventUserA: MockEvent = {
    id: "event-a1",
    user_id: userA.userId!,
    title: "Eleanor & Mark Wedding",
    total_budget: 35000,
  };

  const eventUserB: MockEvent = {
    id: "event-b1",
    user_id: userB.userId!,
    title: "Tech Summit Gala",
    total_budget: 80000,
  };

  it("denies unauthenticated read access to private events", () => {
    const engine = new RlsPolicyEngine([eventUserA, eventUserB]);
    const results = engine.selectEvents(anonUser);
    expect(results).toHaveLength(0);
  });

  it("strictly isolates events between different users", () => {
    const engine = new RlsPolicyEngine([eventUserA, eventUserB]);

    // User A should only see their own event
    const resultsUserA = engine.selectEvents(userA);
    expect(resultsUserA).toHaveLength(1);
    expect(resultsUserA[0]?.id).toBe("event-a1");

    // User B should only see their own event
    const resultsUserB = engine.selectEvents(userB);
    expect(resultsUserB).toHaveLength(1);
    expect(resultsUserB[0]?.id).toBe("event-b1");
  });

  it("prevents User B from spoofing User A during insert", () => {
    const engine = new RlsPolicyEngine([eventUserA]);

    const maliciousEvent: MockEvent = {
      id: "spoofed-event-999",
      user_id: userA.userId!, // User B trying to insert with User A's ID
      title: "Malicious Injection Event",
      total_budget: 1000,
    };

    const res = engine.insertEvent(maliciousEvent, userB);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/RLS check failed/i);
  });

  it("denies User A from modifying or deleting User B's event", () => {
    const engine = new RlsPolicyEngine([eventUserA, eventUserB]);

    // Attempt update on User B's event by User A
    const updateRes = engine.updateEvent("event-b1", { total_budget: 0 }, userA);
    expect(updateRes.success).toBe(false);
    expect(updateRes.error).toMatch(/access denied/i);

    // Attempt delete on User B's event by User A
    const deleteRes = engine.deleteEvent("event-b1", userA);
    expect(deleteRes.success).toBe(false);
    expect(deleteRes.error).toMatch(/Only event owners can delete/i);
  });

  it("allows verified collaborator access when membership exists", () => {
    // User B is granted 'editor' on User A's event
    const collaborator: MockCollaborator = {
      event_id: "event-a1",
      user_id: userB.userId!,
      role: "editor",
    };

    const engine = new RlsPolicyEngine([eventUserA, eventUserB], [collaborator]);

    // User B should now see both their event AND the shared event
    const resultsUserB = engine.selectEvents(userB);
    expect(resultsUserB).toHaveLength(2);
    expect(resultsUserB.map((e) => e.id)).toContain("event-a1");
    expect(resultsUserB.map((e) => e.id)).toContain("event-b1");

    // User B (collaborator) can update the shared event
    const updateRes = engine.updateEvent("event-a1", { title: "Updated Wedding Title" }, userB);
    expect(updateRes.success).toBe(true);

    // But User B cannot delete User A's event (only owner can delete)
    const deleteRes = engine.deleteEvent("event-a1", userB);
    expect(deleteRes.success).toBe(false);
  });
});
