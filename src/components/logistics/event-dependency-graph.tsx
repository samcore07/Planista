"use client";

import * as React from "react";
import {
  DependencyGraphData,
  DependencyGraphNode,
} from "@/services/logistics.service";
import {
  Workflow,
  Clock,
  Flame,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EventDependencyGraphProps {
  graphData: DependencyGraphData;
}

export function EventDependencyGraph({ graphData }: EventDependencyGraphProps) {
  const [selectedNode, setSelectedNode] = React.useState<DependencyGraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = React.useState<string | null>(null);
  const [criticalOnly, setCriticalOnly] = React.useState(false);
  const [zoomLevel, setZoomLevel] = React.useState(1.0);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Compute connected nodes for highlight effect
  const connectedEdgeMap = React.useMemo(() => {
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();

    for (const edge of graphData.edges) {
      if (!incoming.has(edge.toId)) incoming.set(edge.toId, []);
      incoming.get(edge.toId)!.push(edge.fromId);

      if (!outgoing.has(edge.fromId)) outgoing.set(edge.fromId, []);
      outgoing.get(edge.fromId)!.push(edge.toId);
    }

    return { incoming, outgoing };
  }, [graphData.edges]);

  const activeHighlightedNodes = React.useMemo(() => {
    if (!hoveredNodeId) return null;
    const set = new Set<string>();
    set.add(hoveredNodeId);

    const inNodes = connectedEdgeMap.incoming.get(hoveredNodeId) || [];
    inNodes.forEach((id) => set.add(id));

    const outNodes = connectedEdgeMap.outgoing.get(hoveredNodeId) || [];
    outNodes.forEach((id) => set.add(id));

    return set;
  }, [hoveredNodeId, connectedEdgeMap]);

  const displayedNodes = React.useMemo(() => {
    if (!criticalOnly) return graphData.nodes;
    return graphData.nodes.filter((n) => n.isCritical);
  }, [graphData.nodes, criticalOnly]);

  const displayedEdges = React.useMemo(() => {
    const nodeIds = new Set(displayedNodes.map((n) => n.id));
    return graphData.edges.filter(
      (e) => nodeIds.has(e.fromId) && nodeIds.has(e.toId)
    );
  }, [displayedNodes, graphData.edges]);

  return (
    <div className="relative rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/60 to-background/90 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-primary/40">
      {/* Header with Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Workflow className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg font-bold tracking-tight text-foreground">
              Event Dependency Flowchart & Graph
            </h2>
            <Badge variant="outline" className="text-xs font-mono font-normal">
              {displayedNodes.length} Nodes • {displayedEdges.length} Edges
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Interactive topological timeline showing milestone dependencies, prerequisite sequences, and zero-float critical paths.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant={criticalOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setCriticalOnly((prev) => !prev)}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <Flame className="h-3.5 w-3.5" />
            {criticalOnly ? "Show All Nodes" : "Critical Path Only"}
          </Button>

          <div className="flex items-center gap-1 border border-border/70 rounded-lg p-0.5 bg-background/50">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="text-[11px] font-mono font-medium px-1 text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.0)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-l border-border/60 pl-1.5 ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Reset Zoom"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Canvas Scroll Container with Custom Scrollbar & Shadow */}
      <div
        ref={containerRef}
        className="relative mt-5 overflow-x-auto overflow-y-hidden rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent shadow-inner"
        style={{ minHeight: "440px" }}
      >
        {/* Graph Render Canvas */}
        <div
          className="relative transition-transform duration-200 origin-top-left"
          style={{
            width: `${graphData.width}px`,
            height: `${graphData.height}px`,
            transform: `scale(${zoomLevel})`,
          }}
        >
          {/* SVG Canvas for Directed Curved Edges */}
          <svg
            className="absolute inset-0 pointer-events-none w-full h-full"
            style={{ width: `${graphData.width}px`, height: `${graphData.height}px` }}
          >
            <defs>
              <linearGradient id="edgeGradNormal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="edgeGradCritical" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.9" />
              </linearGradient>

              {/* Arrow Heads */}
              <marker
                id="arrow-normal"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#10B981" />
              </marker>

              <marker
                id="arrow-critical"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#EF4444" />
              </marker>
            </defs>

            {displayedEdges.map((edge, idx) => {
              const isConnectedToHovered =
                hoveredNodeId &&
                (edge.fromId === hoveredNodeId || edge.toId === hoveredNodeId);
              const isDimmed = hoveredNodeId && !isConnectedToHovered;

              return (
                <path
                  key={idx}
                  d={edge.pathD}
                  fill="none"
                  stroke={
                    edge.isCritical
                      ? "url(#edgeGradCritical)"
                      : "url(#edgeGradNormal)"
                  }
                  strokeWidth={edge.isCritical ? 3 : 2}
                  strokeDasharray={edge.isCritical ? "none" : isConnectedToHovered ? "4 4" : "none"}
                  markerEnd={edge.isCritical ? "url(#arrow-critical)" : "url(#arrow-normal)"}
                  className={cn(
                    "transition-all duration-300",
                    isDimmed && "opacity-15",
                    isConnectedToHovered && "stroke-primary stroke-[3px] filter drop-shadow(0 0 6px rgba(16,185,129,0.5))"
                  )}
                />
              );
            })}
          </svg>

          {/* Graph Nodes */}
          {displayedNodes.map((node) => {
            const isHovered = hoveredNodeId === node.id;
            const isSelected = selectedNode?.id === node.id;
            const isConnected = activeHighlightedNodes?.has(node.id) ?? true;

            const priorityBadge =
              node.priority === "critical"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                : node.priority === "high"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";

            return (
              <button
                type="button"
                key={node.id}
                onClick={() => setSelectedNode(node)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedNode(node);
                  }
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: "160px",
                }}
                className={cn(
                  "absolute text-left rounded-xl border p-2.5 text-xs transition-all duration-200 cursor-pointer select-none",
                  "bg-card/95 backdrop-blur-md shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  node.isCritical
                    ? "border-rose-500/60 ring-1 ring-rose-500/30"
                    : "border-border/70 hover:border-primary/50",
                  !isConnected && "opacity-35 scale-95",
                  isHovered && "scale-105 z-20 shadow-xl border-primary ring-2 ring-primary/40",
                  isSelected && "ring-2 ring-emerald-500 border-emerald-500 z-30"
                )}
              >
                {/* Node Card Header */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={cn(
                      "text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold",
                      priorityBadge
                    )}
                  >
                    {node.priority}
                  </span>

                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {node.durationHours}h
                  </span>
                </div>

                {/* Node Title */}
                <span className="block font-medium text-[11px] text-foreground leading-snug line-clamp-2">
                  {node.title}
                </span>

                {/* Category & Critical Indicator */}
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  <span className="truncate max-w-[85px] font-mono">{node.category}</span>
                  {node.isCritical ? (
                    <span className="flex items-center gap-0.5 text-rose-500 font-bold font-mono text-[9px]">
                      <Flame className="w-3 h-3" />
                      CPM
                    </span>
                  ) : (
                    <span className="text-muted-foreground/80 font-mono text-[9px]">
                      +{node.slackHours}h
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Node Drawer / Inspector */}
      {selectedNode && (
        <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5 text-xs animate-in fade-in duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">
                {selectedNode.title}
              </span>
              <Badge variant={selectedNode.isCritical ? "destructive" : "outline"} className="text-[10px]">
                {selectedNode.isCritical ? "Critical Path (0h Slack)" : `Float Buffer (+${selectedNode.slackHours}h)`}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Discipline: <span className="text-foreground font-medium">{selectedNode.category}</span> • Estimated Execution:{" "}
              <span className="text-foreground font-medium">{selectedNode.durationHours} hours</span> • Status:{" "}
              <span className="text-foreground font-medium uppercase">{selectedNode.status}</span>
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedNode(null)}
            className="text-xs self-end sm:self-center"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
