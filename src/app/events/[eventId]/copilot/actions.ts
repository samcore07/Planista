"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { EventsDAL } from "@/lib/dal/events.dal";
import { BudgetDAL } from "@/lib/dal/budget.dal";
import { TasksDAL } from "@/lib/dal/tasks.dal";
import { CopilotDAL, CopilotActionProposal, copilotActionProposalSchema, CopilotMessage } from "@/lib/dal/copilot.dal";
import { aiProvider } from "@/lib/ai/provider";
import { EventOrchestratorService } from "@/services/orchestrator.service";

export interface SendMessageResult {
  success: boolean;
  history?: CopilotMessage[];
  error?: string;
}

export async function sendCopilotMessageAction(
  eventId: string,
  userMessageText: string
): Promise<SendMessageResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const trimmed = userMessageText.trim();
  if (!trimmed) return { success: false, error: "Message cannot be empty" };

  // 1. Retrieve authorized event data
  const [event, categories, tasks] = await Promise.all([
    EventsDAL.getEventById(eventId),
    BudgetDAL.getCategories(eventId),
    TasksDAL.getTasks(eventId),
  ]);

  if (!event) return { success: false, error: "Event not found" };

  // 2. Append user message to history
  const userMsg: CopilotMessage = {
    id: `usr_${Date.now()}`,
    sender: "user",
    content: trimmed,
    createdAt: new Date().toISOString(),
  };
  await CopilotDAL.appendMessage(eventId, userMsg);

  // 3. Synthesize contextual action proposal
  const lower = trimmed.toLowerCase();
  let proposal: CopilotActionProposal;

  if (lower.includes("reduce") || lower.includes("cheaper decor") || lower.includes("cut budget")) {
    proposal = {
      actionType: "optimize_category",
      summary: "Reduce floral & decor budget by $1,500 and substitute imported stems",
      explanation:
        "Proposing a $1,500 budget reduction in Floral & Decor by shifting to seasonal local foliage and pillar candles.",
      financialImpact: {
        category: "Floral & Decor",
        amountDelta: -1500,
      },
      tradeOffs: [
        "Limits custom rare botanical varieties in favor of in-season greens",
        "Retains identical ambient warmth and centerpiece scale",
      ],
    };
  } else if (lower.includes("weather") || lower.includes("rain") || lower.includes("storm") || lower.includes("backup")) {
    proposal = {
      actionType: "add_task",
      summary: "Add inclement weather contingency checklist task: Reserve tent sidewalls",
      explanation:
        "Identified outdoor risk. Creating a milestone to verify marquee 72-hour weather guarantee with rental company.",
      tradeOffs: [
        "Adds one coordination verification milestone 3 days before event",
        "Guarantees dry guest seating in case of rainfall",
      ],
    };
  } else if (lower.includes("reschedule") || lower.includes("delay")) {
    const firstTask = tasks[0];
    proposal = {
      actionType: "reschedule_task",
      summary: `Propose shifting earliest task "${firstTask?.title || "Checklist Item"}" by 5 days`,
      explanation:
        "Cascading schedule shift across downstream dependencies to reflect vendor load-in delays.",
      scheduleImpact: {
        taskId: firstTask?.id || "task_1",
        proposedDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      },
      tradeOffs: [
        "Compresses rehearsal window by 5 days",
        "Prevents unconfirmed vendor bookings from blocking timeline",
      ],
    };
  } else {
    // Default through provider abstraction
    proposal = await aiProvider.proposeCopilotAction({ event, categories, tasks }, trimmed);
  }

  // 4. Validate through Zod
  const validatedProposal = copilotActionProposalSchema.parse(proposal);

  // 5. Append Copilot response with proposal
  const copilotMsg: CopilotMessage = {
    id: `cop_${Date.now()}`,
    sender: "copilot",
    content: validatedProposal.explanation,
    proposal: validatedProposal,
    isApplied: false,
    createdAt: new Date().toISOString(),
  };
  await CopilotDAL.appendMessage(eventId, copilotMsg);

  const history = await CopilotDAL.getHistory(eventId);
  return { success: true, history };
}

export async function applyCopilotProposalAction(
  eventId: string,
  messageId: string,
  rawProposal: CopilotActionProposal
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const proposal = copilotActionProposalSchema.parse(rawProposal);

  try {
    // Apply changes strictly via domain services
    if (proposal.actionType === "optimize_category" || proposal.actionType === "adjust_budget") {
      const categories = await BudgetDAL.getCategories(eventId);
      const targetCat = categories.find((c) =>
        c.name.toLowerCase().includes(proposal.financialImpact?.category.toLowerCase() || "")
      );

      if (targetCat && proposal.financialImpact) {
        const newAllocated = Math.max(0, Number(targetCat.allocated_amount) + proposal.financialImpact.amountDelta);
        await BudgetDAL.updateCategory(targetCat.id, targetCat.name, newAllocated);
      }
    } else if (proposal.actionType === "add_task") {
      await TasksDAL.createTask({
        eventId,
        title: "Weather Contingency: Marquee Tent Reserve Check",
        description: "Verify tent delivery team availability and clear vinyl sidewall specs.",
        priority: "high",
        status: "pending",
        category: "Logistics",
      });
    }

    // Mark proposal as applied in conversation history
    await CopilotDAL.markProposalApplied(eventId, messageId);

    // Run unified state recalculation
    await EventOrchestratorService.recalculateEventState(eventId);

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/budget`);
    revalidatePath(`/events/${eventId}/timeline`);
    revalidatePath(`/events/${eventId}/risks`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to apply copilot proposal";
    return { success: false, error: message };
  }
}
