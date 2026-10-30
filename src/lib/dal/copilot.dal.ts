/**
 * @fileoverview Data Access Layer (DAL) for Planning Copilot Conversation and Action Proposals.
 * Enforces controlled action pipelines, preventing raw database mutations by requiring
 * explicit user approval for generated financial or schedule proposals.
 */

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { type Json } from "@/types/database.types";
import { z } from "zod";

/**
 * Validation schema for structured Copilot actions and trade-off proposals.
 */
export const copilotActionProposalSchema = z.object({
  actionType: z.enum([
    "adjust_budget",
    "add_task",
    "reschedule_task",
    "optimize_category",
    "general_advice",
  ]),
  explanation: z.string(),
  summary: z.string(),
  financialImpact: z
    .object({
      category: z.string(),
      amountDelta: z.number(),
    })
    .optional(),
  scheduleImpact: z
    .object({
      taskId: z.string(),
      proposedDate: z.string(),
    })
    .optional(),
  tradeOffs: z.array(z.string()).default([]),
});

export type CopilotActionProposal = z.infer<typeof copilotActionProposalSchema>;

/**
 * Interface representing a message within the Copilot conversation thread.
 */
export interface CopilotMessage {
  id: string;
  sender: "user" | "copilot";
  content: string;
  proposal?: CopilotActionProposal;
  isApplied?: boolean;
  createdAt: string;
}

/**
 * Data Access Layer for persisting and retrieving Copilot conversation threads.
 */
export class CopilotDAL {
  /**
   * Retrieves conversation history stored per event
   */
  static async getHistory(eventId: string): Promise<CopilotMessage[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data } = await supabase
      .from("event_preferences")
      .select("style_preferences")
      .eq("event_id", eventId)
      .single();

    if (!data?.style_preferences) return [];

    const raw = (data.style_preferences as Record<string, unknown>).copilot_history;
    if (Array.isArray(raw)) {
      return raw as CopilotMessage[];
    }
    return [];
  }

  /**
   * Appends a message to the event's copilot conversation history
   */
  static async appendMessage(eventId: string, message: CopilotMessage): Promise<void> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();

    // Fetch existing preferences
    const { data: existing } = await supabase
      .from("event_preferences")
      .select("style_preferences")
      .eq("event_id", eventId)
      .single();

    const currentPrefs = (existing?.style_preferences as Record<string, unknown>) || {};
    const history = (currentPrefs.copilot_history as CopilotMessage[]) || [];
    const updatedHistory = [...history, message];

    // Upsert into event_preferences
    await supabase.from("event_preferences").upsert(
      {
        event_id: eventId,
        style_preferences: {
          ...currentPrefs,
          copilot_history: updatedHistory,
        } as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" }
    );
  }

  /**
   * Marks a proposal message as applied in the conversation history
   */
  static async markProposalApplied(eventId: string, messageId: string): Promise<void> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const history = await this.getHistory(eventId);

    const updated = history.map((m) =>
      m.id === messageId ? { ...m, isApplied: true } : m
    );

    const { data: existing } = await supabase
      .from("event_preferences")
      .select("style_preferences")
      .eq("event_id", eventId)
      .single();

    const currentPrefs = (existing?.style_preferences as Record<string, unknown>) || {};

    await supabase.from("event_preferences").update({
      style_preferences: {
        ...currentPrefs,
        copilot_history: updated,
      } as unknown as Json,
      updated_at: new Date().toISOString(),
    }).eq("event_id", eventId);
  }
}
