import type { Database } from "@/lib/supabase/database.types";
import * as supabase from "@supabase/ssr";
import type { IncomingMessage, ServerResponse } from "http";

/** Minimal request/response shape both API routes and gSSP contexts satisfy. */
type CookieRequest = IncomingMessage & {
  cookies: Partial<{ [key: string]: string }>;
};
type CookieResponse = ServerResponse;

/**
 * Request-scoped client bound to the signing service-role key. Bypasses RLS —
 * keep it to privileged, explicitly authorized flows (auth callback, API
 * auth checks).
 */
export function createServerClient(req: CookieRequest, res: CookieResponse) {
  return createCookieClient(process.env.SUPABASE_SECRET_KEY!, req, res);
}

/**
 * Request-scoped client bound to the browser's session cookies. RLS enforced —
 * use this for every server-rendered page read.
 */
export function createUserServerClient(req: CookieRequest, res: CookieResponse) {
  return createCookieClient(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, req, res);
}

function createCookieClient(key: string, req: CookieRequest, res: CookieResponse) {
  const pendingCookies: { name: string; value: string; options: supabase.CookieOptions }[] = [];

  return supabase.createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: {
      getAll() {
        return Object.entries(req.cookies).map(([name, value]) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
        res.setHeader(
          "Set-Cookie",
          pendingCookies.map((cookie) => serializeCookie(cookie)),
        );
      },
    },
  });
}

function serializeCookie({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: supabase.CookieOptions;
}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.path !== undefined) parts.push(`Path=${options.path}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  return parts.join("; ");
}
