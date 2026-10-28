import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { RenderingIndicator, getRouteRenderingInfo } from "../rendering-indicator";

// Mock next/navigation
let currentMockPathname = "/";
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => currentMockPathname,
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe("getRouteRenderingInfo strategy mapping", () => {
  it("classifies static auth pages as static (○)", () => {
    const login = getRouteRenderingInfo("/auth/login");
    expect(login.type).toBe("static");
    expect(login.symbol).toBe("○");

    const register = getRouteRenderingInfo("/auth/register");
    expect(register.type).toBe("static");

    const notFound = getRouteRenderingInfo("/_not-found");
    expect(notFound.type).toBe("static");
  });

  it("classifies API and auth callback routes as dynamic (ƒ)", () => {
    const callback = getRouteRenderingInfo("/auth/callback");
    expect(callback.type).toBe("dynamic");
    expect(callback.symbol).toBe("ƒ");

    const api = getRouteRenderingInfo("/api/events/123/export");
    expect(api.type).toBe("dynamic");
    expect(api.symbol).toBe("ƒ");
  });

  it("classifies dashboard, events, timeline, and architect as partial prerendered (◐ PPR)", () => {
    const home = getRouteRenderingInfo("/");
    expect(home.type).toBe("ppr");
    expect(home.symbol).toBe("◐");

    const timeline = getRouteRenderingInfo("/events/evt-123/timeline");
    expect(timeline.type).toBe("ppr");
    expect(timeline.symbol).toBe("◐");

    const architect = getRouteRenderingInfo("/events/architect");
    expect(architect.type).toBe("ppr");
  });
});

describe("RenderingIndicator Component UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockPathname = "/events/evt-1/timeline";
  });

  it("renders the floating rendering pill button with the correct route symbol", () => {
    render(<RenderingIndicator />);
    const button = screen.getByTestId("rendering-button");
    expect(button).toBeDefined();
    expect(button.textContent).toContain("◐");
    expect(button.textContent).toContain("PPR");
  });

  it("toggles the route inspector popover on click", () => {
    render(<RenderingIndicator />);
    const button = screen.getByTestId("rendering-button");

    // Popover is closed initially
    expect(screen.queryByTestId("rendering-popover")).toBeNull();

    // Open popover
    fireEvent.click(button);
    expect(screen.getByTestId("rendering-popover")).toBeDefined();
    expect(screen.getByTestId("rendering-pathname").textContent).toBe("/events/evt-1/timeline");
    expect(screen.getByTestId("rendering-strategy-badge").textContent).toContain("PPR");

    // Close popover on second click
    fireEvent.click(button);
    expect(screen.queryByTestId("rendering-popover")).toBeNull();
  });

  it("invokes router.refresh when the refresh button is clicked", () => {
    render(<RenderingIndicator />);
    const button = screen.getByTestId("rendering-button");
    fireEvent.click(button);

    const refreshButton = screen.getByTitle(/Re-render Server Components/i);
    fireEvent.click(refreshButton);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
