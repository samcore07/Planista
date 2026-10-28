"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/types/auth.types";

export type AuthActionResult = {
  success: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
};

async function getEffectiveOrigin(): Promise<string> {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const headersList = await headers();
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost || headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return `${protocol}://${host}`;
  }

  // If the browser accessed via planista-five.vercel.app, preserve it
  if (host.includes("planista-five.vercel.app")) {
    return `https://${host}`;
  }

  // Guard against internal Vercel project domain alias without '-five'
  if (host === "planista.vercel.app" || host.startsWith("planista.vercel.app")) {
    return "https://planista-five.vercel.app";
  }

  if (configuredAppUrl && !configuredAppUrl.includes("placeholder")) {
    if (configuredAppUrl.includes("://planista.vercel.app")) {
      return "https://planista-five.vercel.app";
    }
    return configuredAppUrl;
  }

  return `${protocol}://${host}`;
}

/**
 * Signs in a user with verified email and password
 */
export async function signInWithPassword(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid input data",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  let redirectTo = formData.get("redirectTo")?.toString() || "/dashboard";
  if (redirectTo.startsWith("http")) {
    try {
      const parsedUrl = new URL(redirectTo);
      redirectTo = parsedUrl.pathname + parsedUrl.search;
    } catch {
      redirectTo = "/dashboard";
    }
  }
  if (!redirectTo.startsWith("/")) {
    redirectTo = "/dashboard";
  }

  return {
    success: true,
    redirectTo,
  };
}

/**
 * Registers a new user with full name, email, and password
 */
export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid registration data",
    };
  }

  const origin = await getEffectiveOrigin();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // If Supabase has email confirmation enabled, user session won't be active immediately
  if (data.user && !data.session) {
    return {
      success: true,
      message:
        "Account created! Please check your email to verify your address before signing in.",
    };
  }

  return {
    success: true,
    redirectTo: "/dashboard",
  };
}

/**
 * Initiates Google OAuth redirect
 */
export async function signInWithGoogle(): Promise<void> {
  const origin = await getEffectiveOrigin();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect(`/auth/login?error=${encodeURIComponent(error?.message || "Failed to initialize Google sign in")}`);
  }

  redirect(data.url);
}

/**
 * Signs out the currently authenticated user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

/**
 * Sends a password reset email
 */
export async function requestPasswordReset(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email"),
  };

  const parsed = forgotPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid email address",
    };
  }

  const origin = await getEffectiveOrigin();

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    message: "If an account exists with this email, a recovery link has been sent.",
  };
}

/**
 * Updates the user's password once authenticated through recovery link
 */
export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Passwords must match and meet security rules",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    redirectTo: "/auth/login?updated=true",
  };
}
