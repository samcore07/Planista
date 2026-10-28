import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { type Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  // If an auth exchange code lands at root ('/'), forward directly to /auth/callback
  const authCode = request.nextUrl.searchParams.get("code");
  if (authCode && request.nextUrl.pathname === "/") {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/events");

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/auth/register");

  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.includes("-auth-token") || c.name.startsWith("sb-")
  );

  // Fast path: if there are no auth cookies at all, unauthenticated visitors don't need a remote network roundtrip
  if (!hasAuthCookie) {
    if (isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/login";
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

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

  // IMPORTANT: Avoid using supabase.auth.getSession() in middleware as it is insecure
  // and doesn't revalidate token on the server. Always use getUser().
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
