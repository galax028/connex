import type { SupabaseClient } from "@supabase/supabase-js";

type GetUserResponse = {
  facultyName: string;
  enrolmentYear: number;
  profileUrl: string;
  fullname: string;
  nickname: string | null;
  biography: string | null;
  tags: { id: string; name: string }[];
};

export async function getUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<GetUserResponse | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      `\
      ...faculties(faculty_name:name),\
      enrolment_year,\
      profile_url,\
      fullname,\
      nickname,\
      biography,\
      users_tags(...tags(id, name))\
      `,
    )
    .eq("id", userId)
    .order("created_at", { referencedTable: "users_tags" })
    .single();
  if (error || !data) {
    console.error("[queries.getUser]: ", error);
    return null;
  }

  return {
    facultyName: data.faculty_name,
    enrolmentYear: data.enrolment_year,
    profileUrl: data.profile_url,
    fullname: data.fullname,
    nickname: data.nickname,
    biography: data.biography,
    tags: data.users_tags,
  };
}
