import type { Database } from "@/lib/supabase/database.types";
import { mapPartySummary } from "@/lib/supabase/queries/map-party-summary";
import type { PartyDetail, PartyResult } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getParty(
  supabase: SupabaseClient<Database>,
  partyId: string,
): Promise<PartyDetail | null> {
  const { data, error } = await supabase
    .from("parties")
    .select(
      `\
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
      location_coordinates,\
      party_categories(name),\
      parties_tags(...tags(id, name)),\
      parties_users(user_id, status, created_at, user_profiles(fullname, nickname, profile_url))\
      `,
    )
    .eq("id", partyId)
    .order("created_at", { referencedTable: "parties_users" })
    .order("created_at", { referencedTable: "parties_tags" })
    .maybeSingle();
  if (error) {
    console.error("[queries.getParty]: ", error);
    return null;
  }
  if (!data) return null;

  return mapPartySummary(data as unknown as PartyResult);
}
