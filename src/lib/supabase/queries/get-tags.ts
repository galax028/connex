import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTags(supabase: SupabaseClient<Database>): Promise<string[] | null> {
  const { data, error } = await supabase.from("tags").select("name").order("name");
  if (error) {
    console.error("[queries.getInterestTags]: ", error);
    return null;
  }

  return data.map((tag) => tag.name);
}
