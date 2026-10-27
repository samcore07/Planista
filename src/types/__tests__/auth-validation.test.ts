import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../auth.types";

describe("Authentication Input Validation Schemas", () => {
  describe("loginSchema", () => {
    it("accepts valid email and password", () => {
      const valid = loginSchema.safeParse({
        email: "planner@planista.app",
        password: "StrongPassword123!",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.email).toBe("planner@planista.app");
      }
    });

    it("rejects invalid email formats", () => {
      const invalid = loginSchema.safeParse({
        email: "not-an-email",
        password: "Password123",
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0]?.message).toMatch(/valid email/i);
      }
    });

    it("rejects passwords under 8 characters", () => {
      const invalid = loginSchema.safeParse({
        email: "planner@planista.app",
        password: "short",
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0]?.message).toMatch(/at least 8 characters/i);
      }
    });
  });

  describe("registerSchema", () => {
    it("accepts valid registration data", () => {
      const valid = registerSchema.safeParse({
        fullName: "Eleanor Vance",
        email: "eleanor@vance.com",
        password: "ValidPassword123",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects passwords without an uppercase letter", () => {
      const invalid = registerSchema.safeParse({
        fullName: "Eleanor Vance",
        email: "eleanor@vance.com",
        password: "password123",
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0]?.message).toMatch(/uppercase/i);
      }
    });

    it("rejects passwords without a number", () => {
      const invalid = registerSchema.safeParse({
        fullName: "Eleanor Vance",
        email: "eleanor@vance.com",
        password: "PasswordOnly",
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0]?.message).toMatch(/number/i);
      }
    });

    it("rejects short or empty full names", () => {
      const invalid = registerSchema.safeParse({
        fullName: " ",
        email: "eleanor@vance.com",
        password: "ValidPassword123",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("validates recovery email", () => {
      const valid = forgotPasswordSchema.safeParse({ email: "user@example.com" });
      expect(valid.success).toBe(true);

      const invalid = forgotPasswordSchema.safeParse({ email: "invalid-email" });
      expect(invalid.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts matching complex passwords", () => {
      const valid = resetPasswordSchema.safeParse({
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const invalid = resetPasswordSchema.safeParse({
        password: "NewPassword123",
        confirmPassword: "DifferentPassword123",
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0]?.message).toMatch(/do not match/i);
      }
    });
  });
});
