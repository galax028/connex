import type { PartySummary, PartyParticipant } from "@/lib/supabase/queries/types";

export type MyStatus = "creator" | "joined" | "requested" | "none";

/**
 * Derives the viewer's standing in a party from real rows:
 * organiser → "creator"; own approved row → "joined"; own pending row →
 * "requested"; no row (or a declined one) → "none".
 */
export function deriveMyStatus(party: PartySummary, userId: string): MyStatus {
  if (party.organiserId === userId) return "creator";
  const mine = party.participants.find((participant) => participant.id === userId);
  if (!mine) return "none";
  if (mine.status === "approved") return "joined";
  if (mine.status === "pending") return "requested";
  return "none";
}

export function approvedParticipants(party: PartySummary): PartyParticipant[] {
  return party.participants.filter((participant) => participant.status === "approved");
}

export function pendingRequests(party: PartySummary): PartyParticipant[] {
  return party.participants.filter((participant) => participant.status === "pending");
}
