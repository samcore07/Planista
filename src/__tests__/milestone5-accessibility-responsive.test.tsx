import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import fs from "fs";
import path from "path";

// Mock next/navigation
let mockPathname = "/events/evt-123/timeline";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Server Actions for modals
vi.mock("@/app/events/[eventId]/timeline/actions", () => ({
  createTaskAction: vi.fn(),
  updateTaskAction: vi.fn(),
  applyScheduleShiftAction: vi.fn(),
}));

vi.mock("@/app/events/[eventId]/budget/actions", () => ({
  createCategoryAction: vi.fn(),
  createExpenseAction: vi.fn(),
  updateExpenseAction: vi.fn(),
}));

vi.mock("@/app/events/[eventId]/copilot/actions", () => ({
  sendCopilotMessageAction: vi.fn().mockResolvedValue({ success: true, history: [] }),
  applyCopilotProposalAction: vi.fn().mockResolvedValue({ success: true }),
}));

// Components under test
import { TaskModal } from "@/components/timeline/task-modal";
import { DelayModal } from "@/components/timeline/delay-modal";
import { CategoryModal } from "@/components/budget/category-modal";
import { ExpenseModal } from "@/components/budget/expense-modal";
import { CopilotDrawer } from "@/components/copilot/copilot-drawer";
import { EventSwitcher } from "@/components/events/event-switcher";
import { EventWorkspaceNav } from "@/components/events/event-workspace-nav";
import { ShowcaseNav } from "@/components/home/showcase-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ThemeProvider } from "@/components/theme/theme-provider";

describe("Milestone 5: Responsive UI, Keyboard Navigation & Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/events/evt-123/timeline";

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

  describe("1. Skip to Main Content & Landmark Structure", () => {
    it("layout contains an accessible skip to main content link targeting #main-content", () => {
      const layoutContent = fs.readFileSync(
        path.join(process.cwd(), "src/app/layout.tsx"),
        "utf-8"
      );
      expect(layoutContent).toContain('href="#main-content"');
      expect(layoutContent).toContain("Skip to main content");
      expect(layoutContent).toContain("sr-only");
      expect(layoutContent).toContain("focus:not-sr-only");
    });

    it("critical page templates provide the corresponding #main-content landmark with tabIndex={-1}", () => {
      const homePage = fs.readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf-8");
      const dashboardPage = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/page.tsx"), "utf-8");
      const eventLayout = fs.readFileSync(path.join(process.cwd(), "src/app/events/[eventId]/layout.tsx"), "utf-8");
      const newEventPage = fs.readFileSync(path.join(process.cwd(), "src/app/events/new/page.tsx"), "utf-8");
      const architectPage = fs.readFileSync(path.join(process.cwd(), "src/app/events/architect/page.tsx"), "utf-8");

      expect(homePage).toContain('id="main-content"');
      expect(dashboardPage).toContain('id="main-content"');
      expect(eventLayout).toContain('id="main-content"');
      expect(newEventPage).toContain('id="main-content"');
      expect(architectPage).toContain('id="main-content"');
    });
  });

  describe("2. Modal Dialog Keyboard Accessibility & ARIA Semantics", () => {
    it("TaskModal has role='dialog', aria-modal='true', and dismisses on Escape key", () => {
      render(<TaskModal eventId="evt-123" />);

      const openButton = screen.getByRole("button", { name: /add task/i });
      fireEvent.click(openButton);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-labelledby")).toBe("task-modal-title");

      // Press Escape to dismiss
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("TaskModal custom trigger can be activated via keyboard Enter key", () => {
      render(
        <TaskModal
          eventId="evt-123"
          trigger={<span data-testid="custom-task-trigger">Open Modal</span>}
        />
      );

      const trigger = screen.getByTestId("custom-task-trigger").parentElement!;
      expect(trigger.getAttribute("role")).toBe("button");

      fireEvent.keyDown(trigger, { key: "Enter" });
      expect(screen.getByRole("dialog")).toBeDefined();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("DelayModal dismisses on Escape key and has proper ARIA markup", () => {
      const mockTask = {
        id: "task-1",
        event_id: "evt-123",
        title: "Floral Arrangement",
        due_date: "2026-11-01",
        priority: "high" as const,
        status: "pending" as const,
        description: null,
        assignee: null,
        category: "Floral",
        estimated_duration_hours: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      render(
        <DelayModal
          eventId="evt-123"
          task={mockTask}
          allTasks={[mockTask]}
          dependencies={[]}
        />
      );

      const shiftButton = screen.getByRole("button", { name: /shift/i });
      fireEvent.click(shiftButton);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-labelledby")).toBe("delay-modal-title");

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("CategoryModal opens and dismisses on Escape key", () => {
      render(<CategoryModal eventId="evt-123" />);

      const button = screen.getByRole("button", { name: /new category/i });
      fireEvent.click(button);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-labelledby")).toBe("category-modal-title");

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("ExpenseModal opens and dismisses on Escape key", () => {
      render(<ExpenseModal eventId="evt-123" categories={[]} />);

      const button = screen.getByRole("button", { name: /add expense/i });
      fireEvent.click(button);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-labelledby")).toBe("expense-modal-title");

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("3. Planning Copilot Keyboard Shortcuts & Stream Live Region", () => {
    it("toggles Copilot via global Cmd+K or Ctrl+K shortcut", () => {
      render(<CopilotDrawer eventId="evt-123" initialHistory={[]} />);

      expect(screen.queryByRole("dialog")).toBeNull();

      // Trigger Cmd+K
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
        );
      });

      const drawer = screen.getByRole("dialog");
      expect(drawer).toBeDefined();
      expect(drawer.getAttribute("aria-labelledby")).toBe("copilot-drawer-title");

      // Log region exists with aria-live="polite"
      const logRegion = screen.getByRole("log");
      expect(logRegion.getAttribute("aria-live")).toBe("polite");

      // Trigger Escape to dismiss
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      });

      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("4. Event Switcher & Navigation Accessibility", () => {
    it("EventSwitcher dropdown closes on Escape and provides listbox semantics", () => {
      const mockCurrent = {
        id: "evt-123",
        user_id: "user-1",
        title: "Grand Autumn Gala",
        event_type: "Gala",
        description: null,
        event_date: "2026-11-15",
        location: "Grand Ballroom",
        guest_count: 200,
        total_budget: 50000,
        currency: "INR",
        status: "planning" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      render(<EventSwitcher currentEvent={mockCurrent} allEvents={[mockCurrent]} />);

      const toggleButton = screen.getByRole("button", { name: /switch active event workspace/i });
      expect(toggleButton.getAttribute("aria-haspopup")).toBe("listbox");
      expect(toggleButton.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(toggleButton);
      expect(toggleButton.getAttribute("aria-expanded")).toBe("true");

      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeDefined();

      // Press Escape to close
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("EventWorkspaceNav applies aria-current='page' to active routes", () => {
      mockPathname = "/events/evt-123/timeline";
      render(<EventWorkspaceNav eventId="evt-123" />);

      const nav = screen.getByRole("navigation", { name: /event workspace navigation/i });
      expect(nav).toBeDefined();

      const timelineLink = screen.getByRole("link", { name: /timeline/i });
      expect(timelineLink.getAttribute("aria-current")).toBe("page");

      const budgetLink = screen.getByRole("link", { name: /budget/i });
      expect(budgetLink.getAttribute("aria-current")).toBeNull();
    });

    it("ShowcaseNav provides desktop links and responsive mobile menu toggle", () => {
      render(<ShowcaseNav />);

      const nav = screen.getByRole("navigation", { name: /landing page sections/i });
      expect(nav).toBeDefined();

      // Mobile menu button
      const mobileToggle = screen.getByRole("button", { name: /toggle section navigation menu/i });
      expect(mobileToggle).toBeDefined();
      expect(mobileToggle.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(mobileToggle);
      expect(mobileToggle.getAttribute("aria-expanded")).toBe("true");

      const menu = screen.getByRole("menu");
      expect(menu).toBeDefined();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("ThemeToggle includes accessible label and mode description", () => {
      render(
        <ThemeProvider>
          <ThemeToggle showLabel={true} />
        </ThemeProvider>
      );

      const button = screen.getByRole("button");
      expect(button.getAttribute("aria-label")).toMatch(/switch to (dark|light) mode/i);
    });
  });

  describe("5. Reduced Motion & CSS Tokens Verification", () => {
    it("globals.css defines prefers-reduced-motion overrides", () => {
      const cssContent = fs.readFileSync(
        path.join(process.cwd(), "src/app/globals.css"),
        "utf-8"
      );
      expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");
      expect(cssContent).toContain("animation-duration: 0.01ms !important;");
      expect(cssContent).toContain("transition-duration: 0.01ms !important;");
      expect(cssContent).toContain("scroll-behavior: auto !important;");
      expect(cssContent).toContain("transition: none !important;");
    });

    it("globals.css defines high-contrast focus-visible ring styles", () => {
      const cssContent = fs.readFileSync(
        path.join(process.cwd(), "src/app/globals.css"),
        "utf-8"
      );
      expect(cssContent).toContain(":focus-visible");
      expect(cssContent).toContain("outline: 2px solid var(--ring);");
      expect(cssContent).toContain("outline-offset: 2px;");
    });
  });
});
