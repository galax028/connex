import type { ParticipantJoinedResult, PartyParticipant } from "@/lib/supabase/queries/types";

export function mapParticipant(participant: ParticipantJoinedResult): PartyParticipant | null {
  const profile = participant.user_profiles;
  if (!profile) return null;

  return {
    id: participant.user_id,
    name: profile.fullname,
    nickname: profile.nickname,
    profileUrl: profile.profile_url,
    status: participant.status,
    joinedAt: participant.created_at,
  };
}
