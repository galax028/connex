import { mapParticipant } from "@/lib/supabase/queries/map-participant";
import type { PartyParticipant, PartyResult, PartySummary } from "@/lib/supabase/queries/types";

/**
 * Postgres `point` columns round-trip through PostgREST as the string
 * "(x,y)" (x = longitude, y = latitude).
 */
export function parsePointColumn(
  value: string | null | undefined,
): { lat: number; lng: number } | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)$/);
  if (!match) return undefined;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;
  return { lat, lng };
}

export function formatPointColumn(pin: { lat: number; lng: number }): string {
  return `(${pin.lng},${pin.lat})`;
}

export function mapPartySummary(party: PartyResult): PartySummary {
  const pin = parsePointColumn(party.location_coordinates);
  return {
    id: party.id,
    title: party.name,
    description: party.description,
    categoryId: party.category_id,
    categoryName: party.party_categories?.name ?? null,
    timeStart: party.time_start,
    timeEnd: party.time_end,
    location: party.location ?? "",
    budgetPerPerson: party.estimated_cost,
    approvalRequired: party.approval_required,
    takenSlots: party.taken_slots ?? 1,
    maxSlots: party.max_slots,
    organiserId: party.organiser_id,
    tags: party.parties_tags.map((tag) => ({ id: tag.id, name: tag.name })),
    createdAt: party.created_at,
    participants: party.parties_users
      .map(mapParticipant)
      .filter((participant): participant is PartyParticipant => participant !== null),
    ...(pin ? { locationPin: pin } : {}),
  };
}
