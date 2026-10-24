import type { NextApiRequest, NextApiResponse } from "next";
import type { Database } from "@/lib/supabase/database.types";
import * as supabase from "@supabase/ssr";

export function createServerClient(req: NextApiRequest, res: NextApiResponse) {
  const pendingCookies: { name: string; value: string; options: supabase.CookieOptions }[] = [];

  return supabase.createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
    },
  );
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
