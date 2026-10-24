import type { Database } from "@/lib/supabase/database.types";
import type { ProfileWithTagsResult, UserResult } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserResult | null> {
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
    .maybeSingle();
  if (error) {
    console.error("[queries.getUser]: ", error);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as ProfileWithTagsResult;
  return {
    facultyName: row.faculties?.name ?? null,
    enrolmentYear: row.enrolment_year,
    profileUrl: row.profile_url,
    fullname: row.fullname,
    nickname: row.nickname,
    biography: row.biography,
    tags: row.users_tags.map((tag) => ({ id: tag.id, name: tag.name })),
  };
}
