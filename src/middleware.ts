/**
 * @fileoverview Next.js Edge Middleware for Planista.
 * Intercepts incoming requests to validate authentication cookies, refresh Supabase auth tokens,
 * and enforce security boundaries across protected and public routes.
 */

import { type NextRequest, type NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge middleware handler executing on every incoming matching request.
 *
 * @param request - NextRequest representation of the incoming HTTP request.
 * @returns Evaluated NextResponse with updated session headers and cookie mutations.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (*.svg, *.png, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
