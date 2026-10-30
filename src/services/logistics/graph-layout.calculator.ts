import { TaskItem, TaskDependency } from "../timeline.service";
import {
  DependencyGraphData,
  DependencyGraphEdge,
  DependencyGraphNode,
} from "./logistics.types";

export class GraphLayoutCalculator {
  /**
   * Generates graph layout coordinates for the Dependency Flowchart
   */
  static layout(
    tasks: TaskItem[],
    dependencies: TaskDependency[],
    criticalTaskIds: Set<string>
  ): DependencyGraphData {
    if (tasks.length === 0) {
      return { nodes: [], edges: [], width: 800, height: 400 };
    }

    const taskMap = new Map<string, TaskItem>(tasks.map((t) => [t.id, t]));
    const predMap = new Map<string, string[]>();
    const succMap = new Map<string, string[]>();

    for (const t of tasks) {
      predMap.set(t.id, []);
      succMap.set(t.id, []);
    }

    for (const dep of dependencies) {
      if (taskMap.has(dep.taskId) && taskMap.has(dep.dependsOnTaskId)) {
        predMap.get(dep.taskId)?.push(dep.dependsOnTaskId);
        succMap.get(dep.dependsOnTaskId)?.push(dep.taskId);
      }
    }

    // Assign level via longest path from roots (topological rank)
    const levelMap = new Map<string, number>();

    function getLevel(id: string, visited: Set<string> = new Set()): number {
      if (levelMap.has(id)) return levelMap.get(id)!;
      if (visited.has(id)) return 0; // avoid cycle
      visited.add(id);

      const preds = predMap.get(id) || [];
      if (preds.length === 0) {
        levelMap.set(id, 0);
        return 0;
      }

      let maxPredLevel = 0;
      for (const p of preds) {
        maxPredLevel = Math.max(maxPredLevel, getLevel(p, new Set(visited)));
      }

      const myLevel = maxPredLevel + 1;
      levelMap.set(id, myLevel);
      return myLevel;
    }

    for (const t of tasks) {
      getLevel(t.id);
    }

    // Group tasks by level
    const levelBuckets = new Map<number, string[]>();
    for (const [id, lvl] of levelMap.entries()) {
      const bucket = levelBuckets.get(lvl) || [];
      bucket.push(id);
      levelBuckets.set(lvl, bucket);
    }

    const maxLevel = Math.max(0, ...Array.from(levelBuckets.keys()));
    const colSpacing = 240;
    const rowSpacing = 90;
    const paddingX = 60;
    const paddingY = 60;

    const nodePositions = new Map<string, { x: number; y: number; level: number; row: number }>();

    let maxRowsInAnyLevel = 1;
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const ids = levelBuckets.get(lvl) || [];
      maxRowsInAnyLevel = Math.max(maxRowsInAnyLevel, ids.length);
      ids.forEach((id, rowIdx) => {
        const x = paddingX + lvl * colSpacing;
        const y = paddingY + rowIdx * rowSpacing;
        nodePositions.set(id, { x, y, level: lvl, row: rowIdx });
      });
    }

    const nodes: DependencyGraphNode[] = tasks.map((t) => {
      const pos = nodePositions.get(t.id) || { x: paddingX, y: paddingY, level: 0, row: 0 };
      const isCritical = criticalTaskIds.has(t.id);
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        category: t.category || "General",
        durationHours: Number(t.estimatedDurationHours) || 2.0,
        isCritical,
        slackHours: isCritical ? 0 : 2.5,
        level: pos.level,
        row: pos.row,
        x: pos.x,
        y: pos.y,
      };
    });

    // Create cubic bezier curved paths for edges
    const edges: DependencyGraphEdge[] = [];
    const nodeLookup = new Map<string, DependencyGraphNode>(nodes.map((n) => [n.id, n]));

    for (const dep of dependencies) {
      const source = nodeLookup.get(dep.dependsOnTaskId);
      const target = nodeLookup.get(dep.taskId);

      if (source && target) {
        const x1 = source.x + 160; // node card right edge
        const y1 = source.y + 24; // node center vertical
        const x2 = target.x; // node card left edge
        const y2 = target.y + 24;

        const dx = Math.max(40, (x2 - x1) * 0.5);
        const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        const isCritical = source.isCritical && target.isCritical;

        edges.push({
          fromId: source.id,
          toId: target.id,
          isCritical,
          pathD,
        });
      }
    }

    const graphWidth = Math.max(860, paddingX * 2 + (maxLevel + 1) * colSpacing);
    const graphHeight = Math.max(420, paddingY * 2 + maxRowsInAnyLevel * rowSpacing);

    return {
      nodes,
      edges,
      width: graphWidth,
      height: graphHeight,
    };
  }
}
