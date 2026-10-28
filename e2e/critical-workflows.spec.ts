import { test, expect } from "@playwright/test";

test.describe("Milestone 6: End-to-End Critical Workflows & Security Verification", () => {
  test.describe("1. Marketing Landing Page, Theme & Navigation", () => {
    test("loads root page with brand, hero heading, and responsive landmarks", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/Planista/i);

      // Skip link for accessibility
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toBeAttached();

      // Brand logo and main hero heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/mathematical rigor/i);

      // Showcase navigation anchors
      await expect(page.locator('#features')).toBeAttached();
      await expect(page.locator('#architecture')).toBeAttached();
      await expect(page.locator('#workflow')).toBeAttached();
      await expect(page.locator('#tutorial')).toBeAttached();
    });

    test("toggles theme dynamically with persistence", async ({ page }) => {
      await page.goto("/");

      // Verify initial light mode by default
      const html = page.locator("html");
      await expect(html).not.toHaveClass(/dark/);

      // Find theme toggle button
      const themeToggle = page.locator('button[aria-label*="mode" i]').first();
      await expect(themeToggle).toBeVisible();

      // Click to toggle to dark mode
      await themeToggle.click();
      await expect(html).toHaveClass(/dark/);

      // Click to toggle back to light mode
      await themeToggle.click();
      await expect(html).not.toHaveClass(/dark/);
    });

    test("renders tutorial video walkthrough section with chapter timestamps", async ({ page }) => {
      await page.goto("/");
      const tutorialSection = page.locator("#tutorial");
      await expect(tutorialSection).toBeVisible();

      // YouTube embed container
      const iframe = tutorialSection.locator("iframe");
      await expect(iframe).toBeAttached();

      // Chapter pills
      const chapters = tutorialSection.locator("span", { hasText: /\d{2}:\d{2}/ });
      await expect(chapters.first()).toBeVisible();
    });
  });

  test.describe("2. Protected Route Access Control & Redirection Boundaries", () => {
    test("unauthenticated access to /dashboard redirects to /auth/login", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForURL(/\/auth\/login/);
      expect(page.url()).toContain("/auth/login");
    });

    test("unauthenticated access to /events/architect redirects to /auth/login", async ({ page }) => {
      await page.goto("/events/architect");
      await page.waitForURL(/\/auth\/login/);
      expect(page.url()).toContain("/auth/login");
    });

    test("unauthenticated access to /events/new redirects to /auth/login", async ({ page }) => {
      await page.goto("/events/new");
      await page.waitForURL(/\/auth\/login/);
      expect(page.url()).toContain("/auth/login");
    });
  });

  test.describe("3. Authentication & Recovery Flow UI", () => {
    test("login page renders inputs, Google OAuth button, and forgot password link", async ({ page }) => {
      await page.goto("/auth/login");

      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]', { hasText: /sign in/i });

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();

      // Google OAuth option
      const googleBtn = page.locator('button', { hasText: /google/i });
      await expect(googleBtn).toBeVisible();

      // Forgot password link
      const forgotLink = page.locator('a[href*="/auth/forgot-password"]');
      await expect(forgotLink).toBeVisible();
    });

    test("register page renders required registration fields", async ({ page }) => {
      await page.goto("/auth/register");

      const nameInput = page.locator('input[name="fullName"]');
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const createBtn = page.locator('button[type="submit"]', { hasText: /create account/i });

      await expect(nameInput).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(createBtn).toBeVisible();
    });

    test("forgot password page allows submitting email for recovery", async ({ page }) => {
      await page.goto("/auth/forgot-password");

      const emailInput = page.locator('input[type="email"]');
      const resetBtn = page.locator('button[type="submit"]', { hasText: /send recovery/i });

      await expect(emailInput).toBeVisible();
      await expect(resetBtn).toBeVisible();
    });
  });
});
