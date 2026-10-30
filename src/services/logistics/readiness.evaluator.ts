import { TaskItem } from "../timeline.service";
import { BudgetCategoryRow, ExpenseRow } from "@/lib/dal/budget.dal";
import { RiskRow } from "@/lib/dal/risk.dal";
import {
  CriticalPathAnalysis,
  OperationalReadinessReport,
  ReadinessDimension,
} from "./logistics.types";

export class ReadinessEvaluator {
  /**
   * Evaluates multidimensional Live Operational Readiness (0-100%)
   */
  static evaluate(
    tasks: TaskItem[],
    criticalAnalysis: CriticalPathAnalysis,
    categories: BudgetCategoryRow[],
    expenses: ExpenseRow[],
    risks: RiskRow[]
  ): OperationalReadinessReport {
    // 1. Milestone & Task Health (Weight 30%)
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
    let milestoneScore = 100;

    if (totalTasks > 0) {
      const completionRatio = completedTasks / totalTasks;
      milestoneScore = Math.round(completionRatio * 85 + 15);
      if (blockedTasks > 0) {
        milestoneScore = Math.max(10, milestoneScore - blockedTasks * 12);
      }
    }

    const milestoneDim: ReadinessDimension = {
      name: "Milestone Velocity",
      weight: 0.3,
      score: milestoneScore,
      status: milestoneScore >= 80 ? "optimal" : milestoneScore >= 60 ? "good" : "warning",
      metric: `${completedTasks}/${totalTasks} Tasks (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100}%)`,
      detail: blockedTasks > 0 ? `${blockedTasks} task(s) currently blocked by dependencies` : "All active milestones progressing unblocked",
    };

    // 2. Critical Path Clearance (Weight 30%)
    const critTasks = criticalAnalysis.criticalPath;
    let critScore = 100;
    if (critTasks.length > 0) {
      const critCompleted = critTasks.filter((t) => t.status === "completed").length;
      const critBlocked = critTasks.filter((t) => t.status === "blocked").length;
      critScore = Math.round((critCompleted / critTasks.length) * 70 + 30);
      if (critBlocked > 0) {
        critScore = Math.max(5, critScore - critBlocked * 25);
      }
    }

    const critDim: ReadinessDimension = {
      name: "Critical Path Clearance",
      weight: 0.3,
      score: critScore,
      status: critScore >= 80 ? "optimal" : critScore >= 60 ? "good" : "critical",
      metric: `${critTasks.length} Critical Milestones`,
      detail: `${criticalAnalysis.totalProjectDurationHours} hrs minimum critical duration sequence`,
    };

    // 3. Fiscal Health & Expense Settlement (Weight 25%)
    let fiscalScore = 95;
    const totalBudget = categories.reduce((sum, c) => sum + Number(c.allocated_amount || 0), 0);
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.actual_amount || 0), 0);

    if (totalBudget > 0 && totalSpent > totalBudget) {
      const overrunPct = ((totalSpent - totalBudget) / totalBudget) * 100;
      fiscalScore = Math.max(20, Math.round(100 - overrunPct * 2));
    } else if (totalBudget > 0) {
      fiscalScore = 95;
    }

    const fiscalDim: ReadinessDimension = {
      name: "Fiscal Adherence",
      weight: 0.25,
      score: fiscalScore,
      status: fiscalScore >= 85 ? "optimal" : fiscalScore >= 70 ? "good" : "warning",
      metric: totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% Budget Used` : "Balanced",
      detail: totalSpent > totalBudget ? `Exceeds allocation by ₹${Math.round(totalSpent - totalBudget).toLocaleString("en-IN")}` : "Within designated envelope",
    };

    // 4. Risk Mitigation (Weight 15%)
    let riskScore = 90;
    const highRisks = risks.filter((r) => r.severity === "high" || r.severity === "critical");
    const openHighRisks = highRisks.filter((r) => !r.is_resolved);

    if (openHighRisks.length > 0) {
      riskScore = Math.max(25, 90 - openHighRisks.length * 20);
    }

    const riskDim: ReadinessDimension = {
      name: "Risk Mitigation",
      weight: 0.15,
      score: riskScore,
      status: riskScore >= 80 ? "optimal" : riskScore >= 55 ? "good" : "warning",
      metric: `${openHighRisks.length} High Risks Open`,
      detail: openHighRisks.length > 0 ? "Mitigation contingency plan required" : "All identified threats mitigated or contained",
    };

    const overallScore = Math.round(
      milestoneDim.score * milestoneDim.weight +
      critDim.score * critDim.weight +
      fiscalDim.score * fiscalDim.weight +
      riskDim.score * riskDim.weight
    );

    let tier: OperationalReadinessReport["tier"] = "Launch Ready";
    let tierColor = "#10B981";
    let tierBadgeClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    let summary = "All production disciplines and critical milestones demonstrate high operational integrity.";

    if (overallScore < 50) {
      tier = "Critical Bottlenecks";
      tierColor = "#EF4444";
      tierBadgeClass = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
      summary = "Immediate operational intervention required: critical path blockages or fiscal overruns present.";
    } else if (overallScore < 70) {
      tier = "Elevated Attention";
      tierColor = "#F59E0B";
      tierBadgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
      summary = "Pacing is viable but prerequisite bottlenecks or unresolved risks require active mitigation.";
    } else if (overallScore < 85) {
      tier = "Operational";
      tierColor = "#3B82F6";
      tierBadgeClass = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
      summary = "Steady operational execution. Core logistics are aligned with anticipated milestone delivery.";
    }

    return {
      overallScore,
      tier,
      tierColor,
      tierBadgeClass,
      summary,
      dimensions: [milestoneDim, critDim, fiscalDim, riskDim],
    };
  }
}
