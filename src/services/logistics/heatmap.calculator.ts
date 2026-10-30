import { TaskItem } from "../timeline.service";
import { HeatmapCell, ResourceHeatmap } from "./logistics.types";

export class HeatmapCalculator {
  /**
   * Generates Resource Utilization Heatmap data by Category and Timeline Phase
   */
  static generate(
    tasks: TaskItem[],
    eventDateStr?: string | null
  ): ResourceHeatmap {
    const phases = [
      { id: "p1", label: "Early Blueprint", range: "> 60 Days" },
      { id: "p2", label: "Core Procurement", range: "30 - 60 Days" },
      { id: "p3", label: "Production Prep", range: "14 - 30 Days" },
      { id: "p4", label: "Final Rehearsal", range: "3 - 14 Days" },
      { id: "p5", label: "Zero-Hour Delivery", range: "< 3 Days" },
    ];

    // Collect distinct categories
    const categorySet = new Set<string>();
    for (const t of tasks) {
      categorySet.add(t.category || "General");
    }
    const categories = Array.from(categorySet);
    if (categories.length === 0) categories.push("General Operations");

    const eventTime = eventDateStr ? new Date(eventDateStr).getTime() : Date.now() + 90 * 86400000;

    // Helper to bucket a task into a phase
    const getPhaseId = (t: TaskItem): string => {
      if (!t.dueDate) return "p2";
      const dueTime = new Date(t.dueDate).getTime();
      const daysUntilEvent = Math.max(0, Math.round((eventTime - dueTime) / 86400000));

      if (daysUntilEvent > 60) return "p1";
      if (daysUntilEvent >= 30) return "p2";
      if (daysUntilEvent >= 14) return "p3";
      if (daysUntilEvent >= 3) return "p4";
      return "p5";
    };

    // Calculate matrix
    let maxCellHours = 1;
    const matrix: HeatmapCell[][] = categories.map((cat) => {
      return phases.map((phase) => {
        const matchingTasks = tasks.filter(
          (t) => (t.category || "General") === cat && getPhaseId(t) === phase.id
        );

        const totalHours = matchingTasks.reduce(
          (sum, t) => sum + (Number(t.estimatedDurationHours) || 2.0),
          0
        );

        if (totalHours > maxCellHours) maxCellHours = totalHours;

        return {
          category: cat,
          phaseId: phase.id,
          phaseLabel: phase.label,
          taskCount: matchingTasks.length,
          totalHours: Math.round(totalHours * 10) / 10,
          intensity: 0, // calculated below
          tasks: matchingTasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            hours: Number(t.estimatedDurationHours) || 2.0,
            status: t.status,
          })),
        };
      });
    });

    // Populate intensity percentages
    for (const row of matrix) {
      for (const cell of row) {
        cell.intensity = maxCellHours > 0 ? Math.round((cell.totalHours / maxCellHours) * 100) : 0;
      }
    }

    return {
      categories,
      phases,
      matrix,
      peakHours: Math.round(maxCellHours * 10) / 10,
    };
  }
}
