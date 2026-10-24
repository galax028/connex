import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    // Proactively refresh the session on every matched request.
    // This ensures tokens don't expire while the user only navigates pages.
    await supabase.auth.getClaims();
  } catch {
    // No session to refresh — that's fine, just proceed.
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run proxy on all request paths except:
     * - /api/auth/callback (OAuth code exchange — does not need session refresh)
     * - /api/auth/signout (explicit sign-out — must not refresh)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser default)
     */
    "/((?!api/auth/callback|api/auth/signout|_next/static|_next/image|favicon.ico).*)",
  ],
};
