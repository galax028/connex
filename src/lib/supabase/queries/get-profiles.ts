import type { Database } from "@/lib/supabase/database.types";
import { mapProfile } from "@/lib/supabase/queries/map-profile";
import type { ProfileSummary, ProfileWithTagsResult } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProfiles(
  supabase: SupabaseClient<Database>,
): Promise<ProfileSummary[] | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      `\
      id,\
      fullname,\
      nickname,\
      biography,\
      faculties(name),\
      enrolment_year,\
      profile_url,\
      users_tags(...tags(id, name))\
      `,
    )
    .order("created_at")
    .order("created_at", { referencedTable: "users_tags" });
  if (error) {
    console.error("[queries.getProfiles]: ", error);
    return null;
  }

  return (data as unknown as ProfileWithTagsResult[]).map(mapProfile);
}
