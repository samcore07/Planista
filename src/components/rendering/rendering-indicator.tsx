"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom event name for manual programmatic control if desired
 */
export const RENDERING_EVENT = "planista:rendering";

export function setRenderingState(isRendering: boolean) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(RENDERING_EVENT, { detail: { isRendering } })
    );
  }
}

const emptySubscribe = () => () => {};

export function RenderingIndicator() {
  const pathname = usePathname();

  // Prevent SSR hydration mismatch
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isRendering, setIsRendering] = React.useState(false);
  const activeFetchesRef = React.useRef(0);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Helper to show indicator with an automatic safety timeout
  const startRendering = React.useCallback(() => {
    setIsRendering(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Safety fallback: auto-clear after 8 seconds if navigation or action stalls
    timeoutRef.current = setTimeout(() => {
      setIsRendering(false);
    }, 8000);
  }, []);

  const stopRendering = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Grace period (150ms) so quick transitions feel smooth
    timeoutRef.current = setTimeout(() => {
      if (activeFetchesRef.current <= 0) {
        setIsRendering(false);
      }
    }, 150);
  }, []);

  // Whenever pathname changes, a route traversal has completed!
  React.useEffect(() => {
    stopRendering();
  }, [pathname, stopRendering]);

  // Intercept link clicks, form submissions, and Server Action fetches globally
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Intercept Link Clicks across the entire app
    const handleLinkClick = (e: MouseEvent) => {
      // Ignore modified clicks (e.g. Cmd+click, Ctrl+click)
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const target = (e.target as HTMLElement).closest("a");
      if (!target || !target.href) return;

      // Ignore links that open in new window or are file downloads
      if (target.target && target.target !== "_self") return;
      if (target.hasAttribute("download")) return;

      try {
        const url = new URL(target.href, window.location.href);
        // Only trigger for same-origin internal navigations
        if (url.origin === window.location.origin) {
          const isSamePath =
            url.pathname === window.location.pathname &&
            url.search === window.location.search;

          // If it's just an on-page hash jump (e.g. #pricing), do not trigger
          if (isSamePath && url.hash) {
            return;
          }

          // Real page traversal
          if (!isSamePath) {
            startRendering();
          }
        }
      } catch {
        // Invalid URL, ignore
      }
    };

    // 2. Intercept Form Submissions (Login, Register, and Action buttons)
    const handleFormSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!form) return;

      // Do not trigger for external forms
      const action = form.getAttribute("action");
      if (action && !action.startsWith("/") && !action.startsWith(window.location.origin)) {
        return;
      }

      startRendering();
    };

    // 3. Intercept popstate (browser back/forward button navigation)
    const handlePopState = () => {
      startRendering();
    };

    // 4. Intercept fetch to catch Server Actions (e.g. signInWithPassword, Next.js Actions)
    const originalFetch = window.fetch;
    const patchedFetch = async (...args: Parameters<typeof fetch>) => {
      const [input, init] = args;
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";

      // Ignore background router prefetches and telemetry so UI thread remains silky-smooth
      const isPrefetch =
        url.includes("_rsc") ||
        (init &&
          typeof init === "object" &&
          (init.headers as Record<string, string>)?.[
            "next-router-prefetch"
          ] === "1");

      if (isPrefetch) {
        return originalFetch(...args);
      }

      activeFetchesRef.current += 1;
      startRendering();

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        activeFetchesRef.current = Math.max(0, activeFetchesRef.current - 1);
        if (activeFetchesRef.current === 0) {
          stopRendering();
        }
      }
    };

    // 5. Custom programmatic event listener
    const handleCustomRendering = (e: Event) => {
      const customEvent = e as CustomEvent<{ isRendering: boolean }>;
      if (customEvent.detail?.isRendering) {
        startRendering();
      } else {
        stopRendering();
      }
    };

    let idleId: number | NodeJS.Timeout;
    let attached = false;

    const attachListeners = () => {
      attached = true;
      document.addEventListener("click", handleLinkClick, { capture: true });
      document.addEventListener("submit", handleFormSubmit, { capture: true });
      window.addEventListener("popstate", handlePopState);
      window.addEventListener(RENDERING_EVENT, handleCustomRendering);
      window.fetch = patchedFetch;
    };

    const isTest = typeof process !== "undefined" && process.env.NODE_ENV === "test";
    if (isTest) {
      attachListeners();
    } else if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(attachListeners);
    } else {
      idleId = setTimeout(attachListeners, 200);
    }

    return () => {
      if (typeof window !== "undefined" && "cancelIdleCallback" in window && typeof idleId === "number") {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
      if (attached) {
        document.removeEventListener("click", handleLinkClick, { capture: true });
        document.removeEventListener("submit", handleFormSubmit, { capture: true });
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener(RENDERING_EVENT, handleCustomRendering);
        window.fetch = originalFetch;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startRendering, stopRendering]);

  if (!isMounted || !isRendering) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="rendering-indicator"
      className={cn(
        "fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full border border-border/80 bg-background/95 dark:bg-card/95 px-3 py-1.5 text-xs text-foreground shadow-xl backdrop-blur-md transition-all duration-200 select-none animate-in fade-in slide-in-from-bottom-2"
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>

      <RotateCw className="h-3 w-3 animate-spin text-primary" />

      <span className="font-mono text-[11px] font-medium tracking-tight text-foreground">
        Rendering...
      </span>
    </div>
  );
}
