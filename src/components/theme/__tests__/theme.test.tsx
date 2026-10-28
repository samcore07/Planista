import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { ThemeProvider, useTheme } from "../theme-provider";
import { ThemeToggle } from "../theme-toggle";

function ConsumerComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>
        Set Dark
      </button>
      <button data-testid="set-light" onClick={() => setTheme("light")}>
        Set Light
      </button>
      <button data-testid="toggle" onClick={toggleTheme}>
        Toggle
      </button>
    </div>
  );
}

describe("ThemeProvider & ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to system (resolving light if matchMedia is false)", () => {
    render(
      <ThemeProvider>
        <ConsumerComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("updates theme to dark and sets dark class on html", () => {
    render(
      <ThemeProvider>
        <ConsumerComponent />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId("set-dark"));
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("planista-theme")).toBe("dark");
  });

  it("toggles between dark and light", () => {
    render(
      <ThemeProvider>
        <ConsumerComponent />
      </ThemeProvider>
    );

    // Initial is light -> toggle to dark
    act(() => {
      fireEvent.click(screen.getByTestId("toggle"));
    });
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Toggle back to light
    act(() => {
      fireEvent.click(screen.getByTestId("toggle"));
    });
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("renders ThemeToggle button and responds to user click", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(button).toBeDefined();

    act(() => {
      fireEvent.click(button);
    });

    const lightButton = screen.getByRole("button", { name: /switch to light mode/i });
    expect(lightButton).toBeDefined();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
