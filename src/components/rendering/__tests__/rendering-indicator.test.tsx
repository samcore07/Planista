import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as React from "react";
import { RenderingIndicator, setRenderingState } from "../rendering-indicator";

let currentMockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => currentMockPathname,
}));

describe("RenderingIndicator Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    currentMockPathname = "/";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("is hidden by default when no rendering or traversal is active", () => {
    render(<RenderingIndicator />);
    expect(screen.queryByTestId("rendering-indicator")).toBeNull();
  });

  it("displays 'Rendering...' when a link click navigates to a new page", () => {
    render(
      <div>
        <RenderingIndicator />
        <a href="/dashboard" data-testid="dashboard-link">
          Go to Dashboard
        </a>
      </div>
    );

    expect(screen.queryByTestId("rendering-indicator")).toBeNull();

    const link = screen.getByTestId("dashboard-link");
    act(() => {
      link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    const indicator = screen.getByTestId("rendering-indicator");
    expect(indicator).toBeDefined();
    expect(indicator.textContent).toContain("Rendering...");
  });

  it("displays 'Rendering...' on form submission (e.g. login/register)", () => {
    render(
      <div>
        <RenderingIndicator />
        <form data-testid="login-form">
          <button type="submit" data-testid="login-btn">
            Sign In
          </button>
        </form>
      </div>
    );

    const form = screen.getByTestId("login-form");
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const indicator = screen.getByTestId("rendering-indicator");
    expect(indicator).toBeDefined();
    expect(indicator.textContent).toContain("Rendering...");
  });

  it("displays 'Rendering...' programmatically via setRenderingState and hides on route change", () => {
    const { rerender } = render(<RenderingIndicator />);

    expect(screen.queryByTestId("rendering-indicator")).toBeNull();

    act(() => {
      setRenderingState(true);
    });

    expect(screen.getByTestId("rendering-indicator")).toBeDefined();

    // Route change happens
    currentMockPathname = "/events/123";
    rerender(<RenderingIndicator />);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByTestId("rendering-indicator")).toBeNull();
  });

  it("auto-clears after safety timeout if traversal stalls", () => {
    render(<RenderingIndicator />);

    act(() => {
      setRenderingState(true);
    });

    expect(screen.getByTestId("rendering-indicator")).toBeDefined();

    // Advance beyond 8-second safety fallback
    act(() => {
      vi.advanceTimersByTime(8500);
    });

    expect(screen.queryByTestId("rendering-indicator")).toBeNull();
  });
});
