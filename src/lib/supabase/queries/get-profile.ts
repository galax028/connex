import type { Database } from "@/lib/supabase/database.types";
import { mapProfile } from "@/lib/supabase/queries/map-profile";
import type { ProfileSummary, ProfileWithTagsResult } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileSummary | null> {
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
    .eq("id", userId)
    .order("created_at", { referencedTable: "users_tags" })
    .single();
  if (error) {
    console.error("[queries.getProfile]: ", error);
    return null;
  }

  return mapProfile(data as unknown as ProfileWithTagsResult);
}
