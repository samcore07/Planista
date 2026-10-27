import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${effectiveOrigin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${effectiveOrigin}/auth/login?error=Could%20not%20authenticate%20user`);
}
