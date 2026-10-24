import type { ProfileSummary, ProfileWithTagsResult } from "@/lib/supabase/queries/types";

export function mapProfile(profile: ProfileWithTagsResult): ProfileSummary {
  return {
    id: profile.id,
    name: profile.fullname,
    nickname: profile.nickname,
    biography: profile.biography,
    facultyName: profile.faculties?.name ?? null,
    enrolmentYear: profile.enrolment_year,
    profileUrl: profile.profile_url,
    tags: profile.users_tags,
  };
}
