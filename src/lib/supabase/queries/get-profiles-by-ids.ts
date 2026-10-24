import type { Database } from "@/lib/supabase/database.types";
import { mapProfile } from "@/lib/supabase/queries/map-profile";
import type { ProfileSummary, ProfileWithTagsResult } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProfilesByIds(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<ProfileSummary[] | null> {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return [];

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
    .in("id", uniqueUserIds)
    .order("created_at")
    .order("created_at", { referencedTable: "users_tags" });
  if (error) {
    console.error("[queries.getProfilesByIds]: ", error);
    return null;
  }

  return (data as unknown as ProfileWithTagsResult[]).map(mapProfile);
}
