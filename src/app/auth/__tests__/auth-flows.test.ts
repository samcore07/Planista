import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock headers and navigation
const mockHeaders = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => mockHeaders.get(key.toLowerCase()) || null,
  })),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// Mock Supabase Server Client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  })),
}));

import {
  signInWithPassword,
  signUp,
  signInWithGoogle,
  signOut,
  requestPasswordReset,
  resetPassword,
} from "../actions";

describe("Milestone 6: Authentication, OAuth, Recovery & Open-Redirect Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.clear();
    mockHeaders.set("host", "localhost:3000");
    mockHeaders.set("x-forwarded-proto", "http");
  });

  describe("signInWithPassword & Redirect Security", () => {
    it("authenticates valid credentials and allows safe relative redirects", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

      const formData = new FormData();
      formData.set("email", "planner@planista.app");
      formData.set("password", "SecurePassword123!");
      formData.set("redirectTo", "/events/evt-987/budget");

      const result = await signInWithPassword(formData);
      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe("/events/evt-987/budget");
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "planner@planista.app",
        password: "SecurePassword123!",
      });
    });

    it("sanitizes open-redirect attacks pointing to external domains", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

      const formData = new FormData();
      formData.set("email", "planner@planista.app");
      formData.set("password", "SecurePassword123!");
      formData.set("redirectTo", "https://attacker.evil.com/phishing?token=steal");

      const result = await signInWithPassword(formData);
      expect(result.success).toBe(true);
      // Malicious external origin must be stripped, leaving only the relative path
      expect(result.redirectTo?.startsWith("http")).toBe(false);
      expect(result.redirectTo).toBe("/phishing?token=steal");
    });

    it("resets invalid protocol redirects to default /dashboard", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

      const formData = new FormData();
      formData.set("email", "planner@planista.app");
      formData.set("password", "SecurePassword123!");
      formData.set("redirectTo", "javascript:alert(1)");

      const result = await signInWithPassword(formData);
      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe("/dashboard");
    });

    it("rejects invalid email formats without invoking Supabase", async () => {
      const formData = new FormData();
      formData.set("email", "not-an-email");
      formData.set("password", "SecurePassword123!");

      const result = await signInWithPassword(formData);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/valid email/i);
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it("returns Supabase error message when authentication fails", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: "Invalid login credentials" },
      });

      const formData = new FormData();
      formData.set("email", "planner@planista.app");
      formData.set("password", "WrongPassword123!");

      const result = await signInWithPassword(formData);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid login credentials");
    });
  });

  describe("signUp Registration Flow", () => {
    it("successfully creates an account and returns verification notification if email confirmation is required", async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: "new-user-1" }, session: null },
        error: null,
      });

      const formData = new FormData();
      formData.set("fullName", "Eleanor Vance");
      formData.set("email", "eleanor@vance.com");
      formData.set("password", "StrongPass2026!");

      const result = await signUp(formData);
      expect(result.success).toBe(true);
      expect(result.message).toMatch(/check your email to verify/i);
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "eleanor@vance.com",
        password: "StrongPass2026!",
        options: {
          data: { full_name: "Eleanor Vance" },
          emailRedirectTo: "http://localhost:3000/auth/callback",
        },
      });
    });

    it("rejects weak passwords lacking uppercase letters or minimum length", async () => {
      const formData = new FormData();
      formData.set("fullName", "Eleanor Vance");
      formData.set("email", "eleanor@vance.com");
      formData.set("password", "weakpass");

      const result = await signUp(formData);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/password/i);
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe("OAuth & Session Termination", () => {
    it("initiates Google OAuth with correct callback origin and redirects to provider URL", async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({
        data: { url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=123" },
        error: null,
      });

      await signInWithGoogle();
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: "http://localhost:3000/auth/callback" },
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id=123"
      );
    });

    it("signOut signs out from Supabase and redirects to /auth/login", async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });

      await signOut();
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
    });
  });

  describe("Password Recovery & Reset Flows", () => {
    it("requestPasswordReset handles valid emails and sends recovery link", async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

      const formData = new FormData();
      formData.set("email", "planner@planista.app");

      const result = await requestPasswordReset(formData);
      expect(result.success).toBe(true);
      expect(result.message).toMatch(/recovery link has been sent/i);
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith("planner@planista.app", {
        redirectTo: "http://localhost:3000/auth/reset-password",
      });
    });

    it("resetPassword enforces password confirmation matching", async () => {
      const formData = new FormData();
      formData.set("password", "NewPassword2026!");
      formData.set("confirmPassword", "MismatchPassword2026!");

      const result = await resetPassword(formData);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/passwords (do not match|must match)/i);
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("resetPassword updates user password when confirmation matches", async () => {
      mockUpdateUser.mockResolvedValueOnce({ error: null });

      const formData = new FormData();
      formData.set("password", "NewPassword2026!");
      formData.set("confirmPassword", "NewPassword2026!");

      const result = await resetPassword(formData);
      expect(result.success).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "NewPassword2026!",
      });
    });
  });
});
