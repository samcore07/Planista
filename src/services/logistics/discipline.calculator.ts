import { TaskItem } from "../timeline.service";
import { DisciplineBreakdownItem, DISCIPLINE_COLORS } from "./logistics.types";

export class DisciplineCalculator {
  /**
   * Computes work breakdown by discipline for Donut and Bar charts
   */
  static calculate(tasks: TaskItem[]): DisciplineBreakdownItem[] {
    const categoryMap = new Map<
      string,
      { totalHours: number; completedHours: number; count: number; completedCount: number }
    >();

    let grandTotalHours = 0;

    for (const t of tasks) {
      const cat = t.category || "General";
      const hours = Number(t.estimatedDurationHours) || 2.0;
      grandTotalHours += hours;

      const current = categoryMap.get(cat) || {
        totalHours: 0,
        completedHours: 0,
        count: 0,
        completedCount: 0,
      };
      current.totalHours += hours;
      current.count += 1;
      if (t.status === "completed") {
        current.completedHours += hours;
        current.completedCount += 1;
      }
      categoryMap.set(cat, current);
    }

    let colorIdx = 0;
    const result: DisciplineBreakdownItem[] = [];

    for (const [category, data] of categoryMap.entries()) {
      const percentage =
        grandTotalHours > 0 ? Math.round((data.totalHours / grandTotalHours) * 100) : 0;
      result.push({
        category,
        taskCount: data.count,
        completedCount: data.completedCount,
        totalHours: Math.round(data.totalHours * 10) / 10,
        completedHours: Math.round(data.completedHours * 10) / 10,
        percentage,
        color: DISCIPLINE_COLORS[colorIdx % DISCIPLINE_COLORS.length],
      });
      colorIdx++;
    }

    return result.sort((a, b) => b.totalHours - a.totalHours);
  }
}
