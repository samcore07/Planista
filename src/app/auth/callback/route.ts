import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/config/env";
import { type Database } from "@/types/database.types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  let effectiveOrigin: string;
  if (forwardedHost && !forwardedHost.includes("localhost")) {
    effectiveOrigin = `${forwardedProto}://${forwardedHost}`;
  } else if (configuredAppUrl && !configuredAppUrl.includes("placeholder")) {
    effectiveOrigin = configuredAppUrl;
  } else {
    const urlObj = new URL(request.url);
    effectiveOrigin = urlObj.origin;
  }

  // Guard against internal Vercel project domain alias without '-five'
  if (effectiveOrigin.includes("://planista.vercel.app")) {
    effectiveOrigin = "https://planista-five.vercel.app";
  }

  if (code) {
    const redirectUrl = `${effectiveOrigin}${next.startsWith("/") ? next : `/${next}`}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get("cookie") ?? "";
            return cookieHeader
              .split(";")
              .map((cookie) => {
                const [name, ...rest] = cookie.trim().split("=");
                return { name, value: rest.join("=") };
              })
              .filter((c) => c.name);
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }

    console.error("[AuthCallback] Code exchange failed:", error.message);
    return NextResponse.redirect(
      `${effectiveOrigin}/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${effectiveOrigin}/auth/login?error=Missing%20auth%20code`);
}
