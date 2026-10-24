import type { Database } from "@/lib/supabase/database.types";
import type { PartyChatMessage, PartyChatMessageResult } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function mapPartyChatMessage(message: PartyChatMessageResult): PartyChatMessage {
  const profile = message.user_profiles;

  return {
    id: message.id,
    userId: message.user_id,
    content: message.content,
    createdAt: message.created_at,
    senderName: profile?.fullname ?? "Member",
    senderNickname: profile?.nickname ?? null,
    senderProfileUrl: profile?.profile_url ?? "",
  };
}

export async function getPartyChatMessages(
  supabase: SupabaseClient<Database>,
  partyId: string,
): Promise<PartyChatMessage[] | null> {
  const { data, error } = await supabase
    .from("party_chat_messages")
    .select(
      `\
      id,\
      party_id,\
      user_id,\
      created_at,\
      content,\
      user_profiles(fullname, nickname, profile_url)\
      `,
    )
    .eq("party_id", partyId)
    .order("created_at");
  if (error) {
    console.error("[queries.getPartyChatMessages]: ", error);
    return null;
  }

  return data.map((message) => mapPartyChatMessage(message as unknown as PartyChatMessageResult));
}
