import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTags(
  supabase: SupabaseClient<Database>,
): Promise<{ id: string; name: string }[] | null> {
  const { data, error } = await supabase.from("tags").select("id, name").order("name");
  if (error) {
    console.error("[queries.getTags]: ", error);
    return null;
  }

  return data.map((tag) => ({ id: tag.id, name: tag.name }));
}
