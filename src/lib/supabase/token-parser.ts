/**
 * @fileoverview Shared zero-network JWT cookie parsing utilities for Supabase auth.
 * Deduplicates cookie chunk reconstruction and base64 JWT payload extraction across
 * middleware and server modules, maintaining high performance and clean architecture.
 */

export interface TokenCookieItem {
  name: string;
  value: string;
}

export interface DecodedAuthPayload {
  exp: number;
  sub: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  aud?: string;
  role?: string;
  phone?: string;
  confirmed_at?: string;
  created_at?: string;
  last_sign_in_at?: string;
  updated_at?: string;
}

/**
 * Extracts and decodes the JWT authentication payload from chunked or monolithic Supabase cookies.
 *
 * @param cookiesList - List of cookie name-value pairs from request or cookie store.
 * @returns DecodedAuthPayload if valid token exists, null otherwise.
 */
export function parseAuthTokenPayload(cookiesList: TokenCookieItem[]): DecodedAuthPayload | null {
  const chunkGroups = new Map<string, Array<{ idx: number; value: string }>>();

  for (const c of cookiesList) {
    if (!c.name.includes("-auth-token") && !c.name.startsWith("sb-")) {
      continue;
    }
    const chunkMatch = c.name.match(/^(.*)\.(\d+)$/);
    if (chunkMatch) {
      const baseName = chunkMatch[1];
      const idx = Number.parseInt(chunkMatch[2], 10);
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
            return payload as DecodedAuthPayload;
          }
        }
      }
    } catch {
      // Chunked or non-standard format in this cookie group, try next candidate
    }
  }

  return null;
}
