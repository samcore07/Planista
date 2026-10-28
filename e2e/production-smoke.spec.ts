import { test, expect } from "@playwright/test";

const PROD_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || "https://planista-five.vercel.app";

test.describe("Milestone 8: Live Production Smoke Tests (Vercel)", () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for clean desktop testing
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("1. Live Home Page: branding, hero, workflow phases, and tutorial video", async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: "domcontentloaded" });

    // Verify Title & Brand
    await expect(page).toHaveTitle(/Planista/i);
    const brand = page.locator("header").getByText("Planista").first();
    await expect(brand).toBeVisible();

    // Verify Hero Headings
    const heroHeading = page.getByRole("heading", { level: 1, name: /Where event vision meets/i });
    await expect(heroHeading).toBeVisible();

    // Verify Architecture section
    const archSection = page.locator("#architecture");
    await expect(archSection).toBeAttached();
    await expect(page.getByText("Deterministic Domain Services")).toBeVisible();
    await expect(page.getByText("Zero LLM Financial Math")).toBeVisible();

    // Verify Workflow Phases (PHASE 01 - PHASE 05)
    const workflowSection = page.locator("#workflow");
    await expect(workflowSection).toBeAttached();
    await expect(workflowSection.getByText("PHASE").first()).toBeVisible();
    await expect(workflowSection.getByText("01")).toBeVisible();

    // Verify Tutorial Video & Chapter Badges
    const tutorialSection = page.locator("#tutorial");
    await expect(tutorialSection).toBeAttached();
    const chapterBadges = tutorialSection.locator("span", { hasText: /\d{2}:\d{2}/ });
    await expect(chapterBadges).toHaveCount(4);
  });

  test("2. Live Theme Persistence: toggles dark/light theme dynamically", async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: "domcontentloaded" });

    const themeToggle = page.locator('button[title*="Switch to"], button[aria-label*="Switch to"]').first();
    await expect(themeToggle).toBeVisible();

    // Toggle theme
    const html = page.locator("html");
    const isInitiallyDark = (await html.getAttribute("class"))?.includes("dark");

    await themeToggle.click();

    // Confirm html class toggled
    if (isInitiallyDark) {
      await expect(html).not.toHaveClass(/dark/);
    } else {
      await expect(html).toHaveClass(/dark/);
    }

    // Refresh and confirm state is preserved via cookie/localStorage
    await page.reload({ waitUntil: "domcontentloaded" });
    if (isInitiallyDark) {
      await expect(html).not.toHaveClass(/dark/);
    } else {
      await expect(html).toHaveClass(/dark/);
    }
  });

  test("3. Live Security Boundaries: protected routes redirect unauthenticated visitors to login", async ({ page }) => {
    // Attempt accessing /dashboard
    await page.goto(`${PROD_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("redirectTo");

    // Attempt accessing /events/architect
    await page.goto(`${PROD_URL}/events/architect`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("redirectTo");

    // Attempt accessing /events/new
    await page.goto(`${PROD_URL}/events/new`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("redirectTo");
  });

  test("4. Live Auth UI: Login page renders credentials form & Google OAuth button", async ({ page }) => {
    await page.goto(`${PROD_URL}/auth/login`, { waitUntil: "domcontentloaded" });

    // Verify input fields
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]', { hasText: /Sign in/i });
    const googleButton = page.locator('button[type="submit"]', { hasText: /Continue with Google/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(googleButton).toBeVisible();

    // Verify link to registration
    const registerLink = page.getByRole("link", { name: /Create account/i });
    await expect(registerLink).toBeVisible();
  });

  test("5. Live Auth UI: Registration page renders full form fields", async ({ page }) => {
    await page.goto(`${PROD_URL}/auth/register`, { waitUntil: "domcontentloaded" });

    const nameInput = page.locator('input[name="fullName"]');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]', { hasText: /Create account/i });

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test("6. Live Auth UI: Password recovery form renders and accepts input", async ({ page }) => {
    await page.goto(`${PROD_URL}/auth/forgot-password`, { waitUntil: "domcontentloaded" });

    const emailInput = page.locator('input[name="email"]');
    const submitBtn = page.locator('button[type="submit"]', { hasText: /Send Recovery Link/i });

    await expect(emailInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Fill valid email format
    await emailInput.fill("planner.test@gatherly.ai");
    await expect(emailInput).toHaveValue("planner.test@gatherly.ai");
  });
});
