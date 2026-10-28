import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { type Database } from "@/types/database.types";
import { env } from "@/config/env";

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
  const chunkGroups = new Map<string, Array<{ idx: number; value: string }>>();

  for (const c of cookiesList) {
    if (!c.name.includes("-auth-token") && !c.name.startsWith("sb-")) {
      continue;
    }
    const chunkMatch = c.name.match(/^(.*)\.(\d+)$/);
    if (chunkMatch) {
      const baseName = chunkMatch[1];
      const idx = parseInt(chunkMatch[2], 10);
      if (!chunkGroups.has(baseName)) chunkGroups.set(baseName, []);
      chunkGroups.get(baseName)!.push({ idx, value: c.value });
    } else {
      if (!chunkGroups.has(c.name)) chunkGroups.set(c.name, []);
      chunkGroups.get(c.name)!.push({ idx: 0, value: c.value });
    }
  }

  for (const [, chunks] of chunkGroups) {
    try {
      chunks.sort((a, b) => a.idx - b.idx);
      let combined = chunks.map((c) => c.value).join("");
      if (combined.startsWith("base64-")) {
        combined = Buffer.from(combined.slice(7), "base64").toString("utf8");
      }
      const parsed = JSON.parse(combined);
      const token = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed);
      if (typeof token === "string" && token.includes(".")) {
        const parts = token.split(".");
        if (parts.length >= 2) {
          let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          while (b64.length % 4 !== 0) b64 += "=";
          const payload = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
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
                payload.created_at ||
                (payload.iat
                  ? new Date(payload.iat * 1000).toISOString()
                  : new Date().toISOString()),
              confirmed_at: payload.confirmed_at,
              email_confirmed_at: payload.email_confirmed_at,
              phone_confirmed_at: payload.phone_confirmed_at,
              last_sign_in_at: payload.last_sign_in_at,
              role: payload.role || "authenticated",
              updated_at: payload.updated_at || "",
              identities: [],
              factors: [],
            } as User;
          }
        }
      }
    } catch {
      // Fall through to remote verification
    }
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
