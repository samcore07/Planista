"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RotateCw,
  X,
  ChevronUp,
  ChevronDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RouteRenderingInfo {
  symbol: string;
  type: "static" | "ppr" | "dynamic";
  title: string;
  badgeClass: string;
  description: string;
  legend: string;
}

export function getRouteRenderingInfo(pathname: string): RouteRenderingInfo {
  if (pathname.startsWith("/auth/callback") || pathname.startsWith("/api/")) {
    return {
      symbol: "ƒ",
      type: "dynamic",
      title: "Dynamic (Server Rendered)",
      badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
      description: "Rendered dynamically on demand per request with server-streamed data.",
      legend: "Dynamic server-streamed execution",
    };
  }

  if (
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password" ||
    pathname === "/_not-found"
  ) {
    return {
      symbol: "○",
      type: "static",
      title: "Static (Prerendered)",
      badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
      description: "Prerendered at build time as static HTML for instant edge delivery.",
      legend: "Pre-generated static HTML shell",
    };
  }

  return {
    symbol: "◐",
    type: "ppr",
    title: "Partial Prerender (PPR)",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    description: "Static shell delivered instantly with dynamic React 19 Server Component streaming.",
    legend: "Static shell + streaming Server Components",
  };
}

function getPerformanceMetrics() {
  if (typeof window === "undefined" || !window.performance) {
    return { hydrationDuration: null, loadTime: null };
  }
  const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (navEntries && navEntries.length > 0) {
    const nav = navEntries[0];
    const domReady = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
    const complete = Math.round(nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : performance.now());
    return {
      hydrationDuration: domReady > 0 ? domReady : Math.round(performance.now()),
      loadTime: complete > 0 ? complete : Math.round(performance.now()),
    };
  }
  return {
    hydrationDuration: Math.round(performance.now()),
    loadTime: null,
  };
}

const emptySubscribe = () => () => {};

export function RenderingIndicator() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Prevent hydration mismatch
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isOpen, setIsOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  if (!isMounted) return null;

  const info = getRouteRenderingInfo(pathname);
  const metrics = getPerformanceMetrics();

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start font-sans select-none print:hidden">
      {/* Expanded Details Popover */}
      {isOpen && (
        <div
          data-testid="rendering-popover"
          className={cn(
            "mb-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card/95 p-4 text-xs shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-150"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Zap className="h-3 w-3" />
              </span>
              <div>
                <span className="font-semibold text-foreground text-xs block leading-tight">
                  Next.js Rendering
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Production Runtime
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRefresh}
                title="Re-render Server Components (router.refresh)"
                className={cn(
                  "p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
                  isRefreshing && "animate-spin text-primary"
                )}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Close Inspector"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Active Route Info */}
          <div className="space-y-3 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Current Route</span>
              <span
                data-testid="rendering-pathname"
                className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary font-medium text-foreground truncate max-w-[160px]"
                title={pathname}
              >
                {pathname}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Render Strategy</span>
              <span
                data-testid="rendering-strategy-badge"
                className={cn(
                  "inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded border text-[11px]",
                  info.badgeClass
                )}
              >
                <span className="font-bold text-xs">{info.symbol}</span>
                {info.type.toUpperCase()}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {info.description}
            </p>
          </div>

          {/* Runtime & Performance Metrics */}
          <div className="py-2.5 border-b border-border space-y-1.5 text-[10px] text-muted-foreground font-mono">
            <div className="flex justify-between">
              <span>Architecture</span>
              <span className="text-foreground font-sans">React 19 RSC + Client</span>
            </div>
            <div className="flex justify-between">
              <span>Partial Prefetching</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-sans">Active (PPR)</span>
            </div>
            <div className="flex justify-between">
              <span>Component Caching</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-sans">Enabled</span>
            </div>
            {metrics.hydrationDuration !== null && (
              <div className="flex justify-between">
                <span>DOM Ready / Hydrated</span>
                <span className="text-foreground">{metrics.hydrationDuration}ms</span>
              </div>
            )}
            {metrics.loadTime !== null && (
              <div className="flex justify-between">
                <span>Total Navigation Time</span>
                <span className="text-foreground">{metrics.loadTime}ms</span>
              </div>
            )}
          </div>

          {/* Next.js Route Symbols Legend */}
          <div className="pt-2.5 space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold block">
              Rendering Legend
            </span>
            <div className="grid grid-cols-1 gap-1 text-[10px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">○</span>
                <span>Static (Prerendered HTML)</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">◐</span>
                <span>Partial Prerender (Shell + Streaming)</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">ƒ</span>
                <span>Dynamic (Server Rendered on demand)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Rendering Pill Button */}
      <button
        type="button"
        data-testid="rendering-button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-2.5 py-1 text-xs text-foreground shadow-md backdrop-blur-md hover:bg-card hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40",
          isOpen && "border-primary/50 ring-1 ring-primary/40 bg-card"
        )}
        title="Next.js Rendering Runtime — Click to inspect"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>

        <span className="font-bold font-mono text-[11px] text-foreground">
          {info.symbol}
        </span>

        <span className="text-[11px] font-medium text-foreground tracking-tight">
          {info.type === "ppr" ? "PPR" : info.type === "static" ? "Static" : "Dynamic"}
        </span>

        {isOpen ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform" />
        ) : (
          <ChevronUp className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform" />
        )}
      </button>
    </div>
  );
}
