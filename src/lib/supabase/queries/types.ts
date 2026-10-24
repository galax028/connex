import type { Database } from "@/lib/supabase/database.types";

type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

export type UserResult = {
  facultyName: string | null;
  enrolmentYear: number | null;
  profileUrl: string;
  fullname: string;
  nickname: string | null;
  biography: string | null;
  tags: { id: string; name: string }[];
};

export type PartyResult = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  time_start: string;
  time_end: string | null;
  location: string | null;
  /** Postgres `point` serialized by PostgREST as "(x,y)" with x=lng, y=lat. */
  location_coordinates?: string | null;
  estimated_cost: number | null;
  approval_required: boolean;
  taken_slots: number | null;
  max_slots: number | null;
  organiser_id: string;
  created_at: string;
  party_categories: { name: string } | null;
  parties_tags: { id: string; name: string }[];
  parties_users: ParticipantJoinedResult[];
};

export type ParticipantResult = {
  user_id: string;
  status: ApprovalStatus;
  created_at: string;
};

export type ParticipantProfileResult = {
  fullname: string;
  nickname: string | null;
  profile_url: string;
};

export type ParticipantJoinedResult = ParticipantResult & {
  user_profiles: ParticipantProfileResult | null;
};

export type ProfileResult = {
  id: string;
  fullname: string;
  nickname: string | null;
  biography: string | null;
  faculties: { name: string } | null;
  enrolment_year: number | null;
  profile_url: string;
};

export type ProfileWithTagsResult = ProfileResult & {
  users_tags: { id: string; name: string }[];
};

export type PartyParticipant = {
  id: string;
  name: string;
  nickname: string | null;
  profileUrl: string;
  status: ApprovalStatus;
  joinedAt: string;
};

export type PartySummary = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  timeStart: string;
  timeEnd: string | null;
  location: string;
  locationPin?: { lat: number; lng: number };
  budgetPerPerson: number | null;
  approvalRequired: boolean;
  takenSlots: number;
  maxSlots: number | null;
  organiserId: string;
  tags: { id: string; name: string }[];
  createdAt: string;
  participants: PartyParticipant[];
};

export type PartyDetail = PartySummary;

export type ProfileSummary = {
  id: string;
  name: string;
  nickname: string | null;
  biography: string | null;
  facultyName: string | null;
  enrolmentYear: number | null;
  profileUrl: string;
  tags: { id: string; name: string }[];
};

export type PartyChatMessageResult = {
  id: string;
  party_id: string;
  user_id: string;
  created_at: string;
  content: string;
  user_profiles: {
    fullname: string;
    nickname: string | null;
    profile_url: string;
  } | null;
};

export type PartyChatMessage = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  senderName: string;
  senderNickname: string | null;
  senderProfileUrl: string;
};
