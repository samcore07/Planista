/**
 * @fileoverview Shared domain types and interfaces for Planista AI integrations.
 * Decoupled from provider implementations to prevent circular dependency cycles.
 */

export interface BlueprintGenerationInput {
  eventType: string;
  title?: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  eventDate?: string;
  location?: string;
  preferences?: string;
  dietaryOrAccessibility?: string;
  constraints?: string;
}

export interface CopilotActionProposal {
  actionType: "adjust_budget" | "reschedule_task" | "add_task" | "optimize_category" | "general_advice";
  explanation: string;
  summary: string;
  financialImpact?: {
    category: string;
    amountDelta: number;
  };
  scheduleImpact?: {
    taskId: string;
    proposedDate: string;
  };
  tradeOffs: string[];
}
