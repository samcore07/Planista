"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RiskDAL } from "@/lib/dal/risk.dal";
import { EventOrchestratorService } from "@/services/orchestrator.service";

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
