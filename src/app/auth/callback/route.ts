import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const effectiveOrigin =
    configuredAppUrl && !configuredAppUrl.includes("placeholder") && !requestOrigin.includes("localhost")
      ? configuredAppUrl
      : requestOrigin;

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
