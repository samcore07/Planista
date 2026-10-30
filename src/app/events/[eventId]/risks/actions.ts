/**
 * @fileoverview Server Actions for Event Operational Risk Radar.
 * Handles risk mitigation confirmations and triggers deterministic rule recalculations.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RiskDAL } from "@/lib/dal/risk.dal";
import { EventOrchestratorService } from "@/services/orchestrator.service";

/**
 * Toggles the resolution status of an identified operational risk finding.
 *
 * @param eventId - Target event UUID.
 * @param riskId - Unique identifier of the risk assessment record.
 * @param isResolved - Boolean indicating if the mitigation protocol has been fulfilled.
 */
export async function toggleRiskResolvedAction(
  eventId: string,
  riskId: string,
  isResolved: boolean
): Promise<void> {
  try {
    await RiskDAL.toggleRiskResolved(riskId, isResolved);
    revalidatePath(`/events/${eventId}/risks`);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/dashboard");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle risk status";
    redirect(`/events/${eventId}/risks?error=${encodeURIComponent(message)}`);
  }

  redirect(`/events/${eventId}/risks?saved=true`);
}

/**
 * Triggers a fresh execution of the deterministic Risk Radar audit engine across timeline and budget data.
 *
 * @param eventId - Target event UUID to re-audit.
 */
export async function recalculateRisksAction(eventId: string): Promise<void> {
  try {
    await EventOrchestratorService.recalculateEventState(eventId);
    revalidatePath(`/events/${eventId}/risks`);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/dashboard");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to refresh risk radar";
    redirect(`/events/${eventId}/risks?error=${encodeURIComponent(message)}`);
  }

  redirect(`/events/${eventId}/risks?refreshed=true`);
}
