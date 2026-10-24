import type { Database } from "@/lib/supabase/database.types";
import * as supabase from "@supabase/ssr";

export function createBrowserClient() {
  return supabase.createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
