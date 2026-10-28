"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  className?: string;
  variant?: "ghost" | "outline";
  showLabel?: boolean;
}

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle({
  className,
  variant = "ghost",
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size="sm"
        className={`h-8 w-8 p-0 text-muted-foreground ${className || ""}`}
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-4 w-4 opacity-40" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={toggleTheme}
      type="button"
      className={`h-8 transition-colors ${showLabel ? "px-2.5 gap-2" : "w-8 p-0"} text-muted-foreground hover:text-foreground ${className || ""}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300 transition-transform duration-200 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </Button>
  );
}
