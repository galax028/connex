import type { Database } from "@/lib/supabase/database.types";
import { mapPartySummary } from "@/lib/supabase/queries/map-party-summary";
import type { PartySummary } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function searchParties(
  supabase: SupabaseClient<Database>,
  query: string,
  pagination?: {
    limit?: number;
    offset?: number;
  },
): Promise<PartySummary[] | null> {
  const searchQuery = query.trim();
  if (!searchQuery) return [];

  const limit = Math.min(Math.max(pagination?.limit ?? 20, 0), 20);
  const offset = Math.max(pagination?.offset ?? 0, 0);

  const quotedQuery = JSON.stringify(searchQuery);
  const quotedTagPattern = JSON.stringify(`%${searchQuery}%`);

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
      parties_tags(...tags(id, name))\
      `,
    )
    .or(
      `\
      name.%.${quotedQuery},\
      description.%.${quotedQuery},\
      parties_tags.tags.name.ilike.${quotedTagPattern}\
      `,
    )
    .order("time_start")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "parties_tags" })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[queries.searchParties]: ", error);
    return null;
  }

  return data.map(mapPartySummary);
}
