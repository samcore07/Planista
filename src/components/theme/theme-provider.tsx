"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "planista-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const val = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
  } catch {
    // Ignore access errors
  }
  return "system";
}

function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMedia = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  const handleCustom = () => callback();

  mediaQuery.addEventListener("change", handleMedia);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("planista-theme-change", handleCustom);

  return () => {
    mediaQuery.removeEventListener("change", handleMedia);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("planista-theme-change", handleCustom);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    () => "system" as Theme
  );

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? getSystemTheme() : theme;

  React.useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, [resolvedTheme]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      window.dispatchEvent(new Event("planista-theme-change"));
    } catch {
      // Ignore quota / privacy mode errors
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
