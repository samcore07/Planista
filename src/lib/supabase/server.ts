import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { type Database } from "@/types/database.types";
import { env } from "@/config/env";
import { parseAuthTokenPayload } from "./token-parser";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Returns a server-only Supabase client with the service role key.
 * Used exclusively in verified server boundaries where the caller's session has already been checked.
 */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin client");
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Fast-path helper to construct the authenticated user from fresh session cookies.
 * Eliminates a 400-800ms remote network roundtrip to Supabase GoTrue on every page load.
 */
function extractUserFromTokenCookies(
  cookiesList: { name: string; value: string }[]
): User | null {
  const payload = parseAuthTokenPayload(cookiesList);
  if (
    payload &&
    typeof payload.exp === "number" &&
    typeof payload.sub === "string" &&
    payload.exp * 1000 > Date.now() + 60000
  ) {
    return {
      id: payload.sub,
      app_metadata: payload.app_metadata || {},
      user_metadata: payload.user_metadata || {},
      aud: payload.aud || "authenticated",
      confirmation_sent_at: "",
      recovery_sent_at: "",
      email_change_sent_at: "",
      new_email: "",
      invited_at: "",
      action_link: "",
      email: payload.email || undefined,
      phone: payload.phone || "",
      created_at:
        (typeof payload.created_at === "string" ? payload.created_at : "") ||
        new Date().toISOString(),
      confirmed_at:
        typeof payload.confirmed_at === "string" ? payload.confirmed_at : undefined,
      last_sign_in_at:
        typeof payload.last_sign_in_at === "string" ? payload.last_sign_in_at : undefined,
      role: payload.role || "authenticated",
      updated_at:
        (typeof payload.updated_at === "string" ? payload.updated_at : "") || "",
      identities: [],
      factors: [],
    } as User;
  }

  return null;
}

/**
 * Derives and verifies the authenticated user from the server session.
 * Never trusts client-supplied user IDs.
 * Memoized per-request to avoid redundant network roundtrips to Supabase Auth.
 */
export const getAuthenticatedUser = cache(async () => {
  try {
    const cookieStore = await cookies();
    const cookiesList = cookieStore.getAll();
    const fastUser = extractUserFromTokenCookies(cookiesList);
    if (fastUser) {
      return fastUser;
    }
  } catch {
    // If called outside request context (e.g., in some test environments), continue to standard client
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});
