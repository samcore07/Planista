import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { type Database, RiskSeverity } from "@/types/database.types";
import { EvaluatedRisk } from "@/services/risk.service";

export type RiskRow = Database["public"]["Tables"]["risk_assessments"]["Row"];

export class RiskDAL {
  /**
   * Retrieves all evaluated risks for an event
   */
  static async getRisks(eventId: string): Promise<RiskRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("risk_assessments")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch risks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Synchronizes evaluated risks for an event:
   * Replaces unresolved automated risks with the freshly evaluated findings
   */
  static async syncRisks(eventId: string, newRisks: EvaluatedRisk[]): Promise<RiskRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();

    // 1. Remove unresolved active risks for this event to avoid duplication
    const { error: deleteError } = await supabase
      .from("risk_assessments")
      .delete()
      .eq("event_id", eventId)
      .eq("is_resolved", false);

    if (deleteError) {
      throw new Error(`Failed to clear previous risks: ${deleteError.message}`);
    }

    if (newRisks.length === 0) {
      return [];
    }

    // 2. Insert fresh risks
    const rowsToInsert = newRisks.map((r) => ({
      event_id: eventId,
      title: r.title,
      severity: r.severity as RiskSeverity,
      category: r.category,
      explanation: r.explanation,
      supporting_facts: r.supportingFacts,
      mitigation_action: r.mitigationAction,
      is_resolved: false,
    }));

    const { data, error: insertError } = await supabase
      .from("risk_assessments")
      .insert(rowsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to persist refreshed risks: ${insertError.message}`);
    }

    return data || [];
  }

  /**
   * Toggles the resolved status of a specific risk
   */
  static async toggleRiskResolved(riskId: string, isResolved: boolean): Promise<RiskRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("risk_assessments")
      .update({
        is_resolved: isResolved,
        updated_at: new Date().toISOString(),
      })
      .eq("id", riskId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update risk status: ${error?.message || "Risk not found"}`);
    }

    return data;
  }
}
