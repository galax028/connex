import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPartyCategories(
  supabase: SupabaseClient<Database>,
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("party_categories")
    .select("name")
    .order("name");
  if (error) {
    console.error("[queries.getPartyCategories]: ", error);
    return null;
  }

  return data.map((category) => category.name);
}
