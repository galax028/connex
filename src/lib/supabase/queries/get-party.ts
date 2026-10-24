import type { Database } from "@/lib/supabase/database.types";
import { mapParticipant } from "@/lib/supabase/queries/map-participant";
import { mapPartySummary } from "@/lib/supabase/queries/map-party-summary";
import type {
  PartyDetail,
  PartyDetailResult,
  PartyParticipant,
} from "@/lib/supabase/queries/types";
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

  return {
    ...mapPartySummary(data as unknown as PartyDetailResult),
    participants: (data as unknown as PartyDetailResult).parties_users
      .map(mapParticipant)
      .filter((participant): participant is PartyParticipant => participant !== null),
  };
}
