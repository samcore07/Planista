"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { aiProvider, BlueprintGenerationInput } from "@/lib/ai/provider";
import { EventBlueprint, eventBlueprintSchema } from "@/types/blueprint.types";
import { EventOrchestratorService } from "@/services/orchestrator.service";
import { EventsDAL } from "@/lib/dal/events.dal";

export interface GenerateBlueprintResult {
  success: boolean;
  blueprint?: EventBlueprint;
  error?: string;
}

export interface PersistBlueprintInput {
  input: BlueprintGenerationInput;
  blueprint: EventBlueprint;
  selectedSections: {
    budget: boolean;
    tasks: boolean;
    vendors: boolean;
    theme: boolean;
    risks: boolean;
  };
}

export interface PersistBlueprintResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export async function generateBlueprintAction(
  rawInput: BlueprintGenerationInput
): Promise<GenerateBlueprintResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please sign in to architect an event." };
  }

  // Attempt generation with automatic retry on malformed output
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const blueprint = await aiProvider.generateBlueprint(rawInput);
      const parsed = eventBlueprintSchema.safeParse(blueprint);
      if (parsed.success) {
        return { success: true, blueprint: parsed.data };
      }
    } catch (err: unknown) {
      if (attempts >= maxAttempts) {
        const message = err instanceof Error ? err.message : "Failed to generate structured blueprint";
        return { success: false, error: message };
      }
    }
  }

  return { success: false, error: "Unable to parse valid blueprint from AI generator." };
}

export async function persistAcceptedBlueprintAction(
  payload: PersistBlueprintInput
): Promise<PersistBlueprintResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { input, blueprint, selectedSections } = payload;

  try {
    const supabase = await createClient();

    // 1. Create the parent event
    const event = await EventsDAL.createEvent({
      title: blueprint.overview.title || input.title || `${input.eventType} Gathering`,
      eventType: input.eventType,
      description: blueprint.overview.description,
      eventDate: input.eventDate ? new Date(input.eventDate).toISOString() : undefined,
      location: input.location,
      guestCount: input.guestCount || 0,
      totalBudget: input.totalBudget || 0,
      currency: input.currency || "USD",
    });

    const eventId = event.id;
    const targetDate = input.eventDate ? new Date(input.eventDate) : new Date(Date.now() + 180 * 86400000);

    // 2. Persist accepted Budget Categories
    if (selectedSections.budget && blueprint.budgetAllocations.length > 0) {
      const categoryInserts = blueprint.budgetAllocations.map((b) => ({
        event_id: eventId,
        name: b.category,
        allocated_amount: b.suggestedAmount,
      }));

      await supabase.from("budget_categories").insert(categoryInserts);
    }

    // 3. Persist accepted Timeline Tasks & Dependencies
    if (selectedSections.tasks && blueprint.tasks.length > 0) {
      const taskTitleToId = new Map<string, string>();

      for (const t of blueprint.tasks) {
        // Calculate due date based on relativeDaysBeforeEvent
        const taskDueDate = new Date(targetDate.getTime() - t.relativeDaysBeforeEvent * 86400000);

        const { data: insertedTask } = await supabase
          .from("timeline_tasks")
          .insert({
            event_id: eventId,
            title: t.title,
            description: t.description,
            due_date: taskDueDate.toISOString(),
            priority: t.priority,
            status: "pending",
            category: t.category,
          })
          .select("id, title")
          .single();

        if (insertedTask) {
          taskTitleToId.set(insertedTask.title, insertedTask.id);
        }
      }

      // Persist dependencies
      const depInserts: { task_id: string; depends_on_task_id: string }[] = [];
      for (const t of blueprint.tasks) {
        const taskId = taskTitleToId.get(t.title);
        if (taskId && t.dependsOnTitles && t.dependsOnTitles.length > 0) {
          for (const depTitle of t.dependsOnTitles) {
            const dependsOnId = taskTitleToId.get(depTitle);
            if (dependsOnId && dependsOnId !== taskId) {
              depInserts.push({
                task_id: taskId,
                depends_on_task_id: dependsOnId,
              });
            }
          }
        }
      }

      if (depInserts.length > 0) {
        await supabase.from("task_dependencies").insert(depInserts);
      }
    }

    // 4. Persist accepted Vendors (Explicitly as initial archetypes/inquiries, unverified)
    if (selectedSections.vendors && blueprint.vendorRequirements.length > 0) {
      const vendorInserts = blueprint.vendorRequirements.map((v) => ({
        event_id: eventId,
        name: v.nameRecommendation,
        category: v.category,
        quoted_amount: v.estimatedCostRange.max,
        status: "inquiry" as const,
        notes: `${v.notes} [Estimated range: $${v.estimatedCostRange.min} - $${v.estimatedCostRange.max}]`,
      }));

      await supabase.from("vendors").insert(vendorInserts);
    }

    // 5. Persist accepted Theme Concept
    if (selectedSections.theme && blueprint.theme) {
      await supabase.from("theme_concepts").insert({
        event_id: eventId,
        name: blueprint.theme.themeName,
        description: blueprint.theme.conceptDescription,
        color_palette: blueprint.theme.palette,
        decor_direction: blueprint.theme.decorDirection,
        lighting_styling: blueprint.theme.lightingDirection,
        floral_ideas: blueprint.theme.floralDirection || null,
        invitation_direction: blueprint.theme.invitationDirection,
        is_selected: true,
      });
    }

    // 6. Persist accepted Contingencies & Risks
    if (selectedSections.risks && blueprint.contingencies.length > 0) {
      const riskInserts = blueprint.contingencies.map((c) => ({
        event_id: eventId,
        title: c.riskTitle,
        severity: (c.impact === "high" ? "high" : c.impact === "medium" ? "medium" : "low") as "low" | "medium" | "high" | "critical",
        category: "planning",
        explanation: `Identified contingency plan: ${c.contingencyPlan}`,
        supporting_facts: [`Probability: ${c.probability}`, `Impact: ${c.impact}`],
        mitigation_action: c.contingencyPlan,
        is_resolved: false,
      }));

      await supabase.from("risk_assessments").insert(riskInserts);
    }

    // 7. Run unified state recalculation
    await EventOrchestratorService.recalculateEventState(eventId);

    revalidatePath("/dashboard");
    revalidatePath(`/events/${eventId}`);

    return { success: true, eventId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to persist accepted blueprint";
    return { success: false, error: message };
  }
}
