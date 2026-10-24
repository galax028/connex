import type { PartyResult, PartySummary } from "@/lib/supabase/queries/types";

export function mapPartySummary(party: PartyResult): PartySummary {
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
  };
}
