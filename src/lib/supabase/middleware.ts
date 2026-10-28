import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { type Database } from "@/types/database.types";

/**
 * Fast-path helper to parse JWT expiry and user data from Supabase auth cookies without a remote network call.
 * Handles both single and chunked cookies (.0, .1, etc.) and base64 payloads.
 * Avoids blocking every navigation with a 500-900ms roundtrip when the token is already fresh.
 */
function getAuthTokenPayload(request: NextRequest): { exp: number; sub: string; email?: string } | null {
  const allCookies = request.cookies.getAll();
  const chunkGroups = new Map<string, Array<{ idx: number; value: string }>>();

  for (const c of allCookies) {
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
          if (payload && typeof payload.exp === "number" && typeof payload.sub === "string") {
            return { exp: payload.exp, sub: payload.sub, email: payload.email };
          }
        }
      }
    } catch {
      // Chunked or non-standard format in this cookie group, check next candidate
    }
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  // If an auth exchange code lands at root ('/'), forward directly to /auth/callback
  const authCode = request.nextUrl.searchParams.get("code");
  if (authCode && request.nextUrl.pathname === "/") {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/events");

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/auth/register");

  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1";

  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.includes("-auth-token") || c.name.startsWith("sb-")
  );

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Fast path 1: If completely unauthenticated visitor
  if (!hasAuthCookie) {
    if (isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/login";
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Fast path 2: Speculative background prefetches should never trigger remote auth roundtrips
  if (isPrefetch) {
    return response;
  }

  // Fast path 3: Public / marketing routes don't require server session refresh in middleware
  if (!isProtectedRoute && !isAuthRoute) {
    return response;
  }

  // Fast path 4: If token is parsed locally and has > 60 seconds of valid life remaining
  const tokenPayload = getAuthTokenPayload(request);
  if (tokenPayload) {
    const isTokenFresh = tokenPayload.exp * 1000 > Date.now() + 60000;
    if (isTokenFresh) {
      // Authenticated user trying to access login/register -> redirect to dashboard instantly
      if (isAuthRoute) {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = "/dashboard";
        dashboardUrl.search = "";
        return NextResponse.redirect(dashboardUrl);
      }
      // Authenticated user on protected route with fresh token -> bypass remote roundtrip
      if (isProtectedRoute) {
        return response;
      }
    }
  }

  // Slow path: Token is near expiration (or unparseable), refresh via Supabase Auth
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Revalidate or refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If unauthorized user visits a protected route, redirect to login
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If already authenticated user visits login/register, redirect to dashboard
  if (user && isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
