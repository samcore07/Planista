/**
 * @fileoverview Logistics Service Facade for Event Operations.
 * Orchestrates CPM Critical Path Analysis, Multidimensional Operational Readiness,
 * Resource Utilization Heatmaps, Discipline Work Breakdowns, and Dependency Graph Layouts.
 * Decomposed into focused, single-responsibility calculator modules under ./logistics/.
 */

import { TaskItem, TaskDependency } from "./timeline.service";
import { BudgetCategoryRow, ExpenseRow } from "@/lib/dal/budget.dal";
import { RiskRow } from "@/lib/dal/risk.dal";

export * from "./logistics/logistics.types";
import {
  CriticalPathAnalysis,
  OperationalReadinessReport,
  ResourceHeatmap,
  DisciplineBreakdownItem,
  DependencyGraphData,
} from "./logistics/logistics.types";
import { CriticalPathCalculator } from "./logistics/critical-path.calculator";
import { ReadinessEvaluator } from "./logistics/readiness.evaluator";
import { HeatmapCalculator } from "./logistics/heatmap.calculator";
import { DisciplineCalculator } from "./logistics/discipline.calculator";
import { GraphLayoutCalculator } from "./logistics/graph-layout.calculator";

export class LogisticsService {
  /**
   * Computes Critical Path Method (CPM) with Early/Late start & finish and Slack/Float
   */
  static analyzeCriticalPath(
    tasks: TaskItem[],
    dependencies: TaskDependency[]
  ): CriticalPathAnalysis {
    return CriticalPathCalculator.analyze(tasks, dependencies);
  }

  /**
   * Evaluates multidimensional Live Operational Readiness (0-100%)
   */
  static evaluateReadiness(
    tasks: TaskItem[],
    criticalAnalysis: CriticalPathAnalysis,
    categories: BudgetCategoryRow[],
    expenses: ExpenseRow[],
    risks: RiskRow[]
  ): OperationalReadinessReport {
    return ReadinessEvaluator.evaluate(
      tasks,
      criticalAnalysis,
      categories,
      expenses,
      risks
    );
  }

  /**
   * Generates Resource Utilization Heatmap data by Category and Timeline Phase
   */
  static generateResourceHeatmap(
    tasks: TaskItem[],
    eventDateStr?: string | null
  ): ResourceHeatmap {
    return HeatmapCalculator.generate(tasks, eventDateStr);
  }

  /**
   * Computes work breakdown by discipline for Donut and Bar charts
   */
  static getDisciplineBreakdown(tasks: TaskItem[]): DisciplineBreakdownItem[] {
    return DisciplineCalculator.calculate(tasks);
  }

  /**
   * Generates graph layout coordinates for the Dependency Flowchart
   */
  static layoutDependencyGraph(
    tasks: TaskItem[],
    dependencies: TaskDependency[],
    criticalTaskIds: Set<string>
  ): DependencyGraphData {
    return GraphLayoutCalculator.layout(tasks, dependencies, criticalTaskIds);
  }
}
