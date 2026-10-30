import { TaskItem } from "../timeline.service";

export interface CriticalPathTask extends TaskItem {
  durationHours: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalSlack: number;
  freeSlack: number;
  isCritical: boolean;
  predecessorIds: string[];
  successorIds: string[];
}

export interface CriticalPathAnalysis {
  criticalPath: CriticalPathTask[];
  allTasks: CriticalPathTask[];
  totalProjectDurationHours: number;
  criticalTaskCount: number;
  nonCriticalTaskCount: number;
  averageSlackHours: number;
}

export interface ReadinessDimension {
  name: string;
  weight: number;
  score: number; // 0 - 100
  status: "optimal" | "good" | "warning" | "critical";
  metric: string;
  detail: string;
}

export interface OperationalReadinessReport {
  overallScore: number; // 0 - 100
  tier: "Launch Ready" | "Operational" | "Elevated Attention" | "Critical Bottlenecks";
  tierColor: string;
  tierBadgeClass: string;
  summary: string;
  dimensions: ReadinessDimension[];
}

export interface HeatmapCell {
  category: string;
  phaseId: string;
  phaseLabel: string;
  taskCount: number;
  totalHours: number;
  intensity: number; // 0 to 100% relative to peak cell
  tasks: { id: string; title: string; priority: string; hours: number; status: string }[];
}

export interface ResourceHeatmap {
  categories: string[];
  phases: { id: string; label: string; range: string }[];
  matrix: HeatmapCell[][];
  peakHours: number;
}

export interface DisciplineBreakdownItem {
  category: string;
  taskCount: number;
  completedCount: number;
  totalHours: number;
  completedHours: number;
  percentage: number;
  color: string;
}

export interface DependencyGraphNode {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "blocked";
  category: string;
  durationHours: number;
  isCritical: boolean;
  slackHours: number;
  level: number; // topological column level (0, 1, 2, ...)
  row: number; // vertical index in level
  x: number;
  y: number;
}

export interface DependencyGraphEdge {
  fromId: string;
  toId: string;
  isCritical: boolean;
  pathD: string;
}

export interface DependencyGraphData {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  width: number;
  height: number;
}

export const DISCIPLINE_COLORS = [
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Orange
];
