import type { Database } from "@/lib/supabase/database.types";
import { mapPartySummary } from "@/lib/supabase/queries/map-party-summary";
import type { PartySummary } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPartiesByParticipant(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<PartySummary[] | null> {
  const { data, error } = await supabase
    .from("parties")
    .select(
      `
      id,\
      name,\
      description,\
      category_id,\
      time_start,\
      time_end,\
      location,\
      estimated_cost,\
      approval_required,\
      taken_slots,\
      max_slots,\
      organiser_id,\
      created_at,\
      party_categories(name),\
      parties_tags(...tags(id, name)),\
      parties_users!inner(user_id)\
      `,
    )
    .eq("parties_users.user_id", userId)
    .order("time_start")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "parties_tags" });
  if (error) {
    console.error("[queries.getPartiesByParticipant]: ", error);
    return null;
  }

  return data.map(mapPartySummary);
}
