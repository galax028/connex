import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPartyCategories(
  supabase: SupabaseClient<Database>,
): Promise<{ id: string; name: string }[] | null> {
  const { data, error } = await supabase
    .from("party_categories")
    .select("id, name")
    .order("name");
  if (error) {
    console.error("[queries.getPartyCategories]: ", error);
    return null;
  }

  return data.map((category) => ({ id: category.id, name: category.name }));
}
