import type { DayWithin, TimeOfDay } from "@/lib/filters";
import type { Database } from "@/lib/supabase/database.types";
import { mapPartySummary } from "@/lib/supabase/queries/map-party-summary";
import type { PartyResult, PartySummary } from "@/lib/supabase/queries/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const SELECT_COLUMNS = `\
  id,\
  name,\
  description,\
  category_id,\
  time_start,\
  time_end,\
  location,\
  estimated_cost,\
  approval_required,\
  taken_slots,\
  max_slots,\
  organiser_id,\
  created_at,\
  party_categories(name),\
  parties_tags(...tags(id, name)),\
  parties_users(user_id, status, created_at, user_profiles(fullname, nickname, profile_url))
`;

export type SearchFilters = {
  text?: string;
  category?: string[];
  dayWithin?: DayWithin[];
  timeOfDay?: TimeOfDay[];
  budgetMax?: number;
  minSpots?: number;
  area?: string[];
};

export type SearchPartiesResult = {
  parties: PartySummary[];
  hasMore: boolean;
  /** Raw-row cursor for the next page; differs from parties.length when the
   * timeOfDay refinement drops rows after fetching. */
  nextOffset: number;
  /** When a text search ran: matching party ids in trigram-similarity rank
   * order, for relevance sorting of the loaded pages. */
  textOrder?: string[];
};

const MAX_LIMIT = 20;

function buildDayClauses(days: DayWithin[]): string[] {
  const clauses: string[] = [];
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });

  for (const day of days) {
    const today = dayFmt.format(new Date());
    const tomorrow = dayFmt.format(new Date(Date.now() + 86_400_000));

    if (day === "today") {
      clauses.push(
        `and(time_start.gte.${JSON.stringify(`${today}T00:00:00+07:00`)},time_start.lt.${JSON.stringify(`${tomorrow}T00:00:00+07:00`)})`,
      );
    } else if (day === "tomorrow") {
      const dayAfter = dayFmt.format(new Date(Date.now() + 2 * 86_400_000));
      clauses.push(
        `and(time_start.gte.${JSON.stringify(`${tomorrow}T00:00:00+07:00`)},time_start.lt.${JSON.stringify(`${dayAfter}T00:00:00+07:00`)})`,
      );
    } else if (day === "weekend") {
      const now = new Date();
      const weekdayFmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        weekday: "short",
      });
      const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const currentIdx = weekdays.indexOf(weekdayFmt.format(now));
      if (currentIdx === 6) {
        clauses.push(
          `and(time_start.gte.${JSON.stringify(`${today}T00:00:00+07:00`)},time_start.lt.${JSON.stringify(`${tomorrow}T00:00:00+07:00`)})`,
        );
      } else if (currentIdx === 0) {
        clauses.push(
          `and(time_start.gte.${JSON.stringify(`${today}T00:00:00+07:00`)},time_start.lt.${JSON.stringify(`${tomorrow}T00:00:00+07:00`)})`,
        );
        const nextSat = dayFmt.format(new Date(Date.now() + 6 * 86_400_000));
        const nextMon = dayFmt.format(new Date(Date.now() + 8 * 86_400_000));
        clauses.push(
          `and(time_start.gte.${JSON.stringify(`${nextSat}T00:00:00+07:00`)},time_start.lt.${JSON.stringify(`${nextMon}T00:00:00+07:00`)})`,
        );
      } else {
        const daysUntilSaturday = (6 - currentIdx) % 7;
        const satDate = dayFmt.format(new Date(Date.now() + daysUntilSaturday * 86_400_000));
        const monDate = dayFmt.format(new Date(Date.now() + (daysUntilSaturday + 2) * 86_400_000));
        clauses.push(
          `and(time_start.gte.${JSON.stringify(`${satDate}T00:00:00+07:00`)},time_start.lt.${JSON.stringify(`${monDate}T00:00:00+07:00`)})`,
        );
      }
    } else if (day === "this_week") {
      clauses.push(
        `time_start.lte.${JSON.stringify(new Date(Date.now() + 7 * 86_400_000).toISOString())}`,
      );
    }
  }
  return clauses;
}

function matchesBangkokHour(party: PartySummary, timeOfDay: TimeOfDay): boolean {
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "numeric",
    hourCycle: "h23",
  });
  const hour = Number(hourFmt.format(new Date(party.timeStart))) % 24;
  if (timeOfDay === "morning") return hour < 12;
  if (timeOfDay === "afternoon") return hour >= 12 && hour < 17;
  return hour >= 17;
}

export async function searchParties(
  supabase: SupabaseClient<Database>,
  filters: SearchFilters,
  userId: string,
  pagination?: { limit?: number; offset?: number },
): Promise<SearchPartiesResult | null> {
  const limit = Math.min(Math.max(pagination?.limit ?? MAX_LIMIT, 0), MAX_LIMIT);
  const offset = Math.max(pagination?.offset ?? 0, 0);
  if (limit === 0) return { parties: [], hasMore: false, nextOffset: offset };

  const text = filters.text?.trim();
  let textOrder: string[] | undefined;
  const [matchingTagIds, matchingCategoryIds, joinedRowsResult] = await Promise.all([
    getMatchingTagIds(supabase, text),
    getCategoryIds(supabase, filters.category),
    supabase.from("parties_users").select("party_id").eq("user_id", userId),
  ]);
  if (joinedRowsResult.error || matchingTagIds === null || matchingCategoryIds === null) {
    console.error(
      "[queries.searchParties]: ",
      joinedRowsResult.error ?? matchingTagIds ?? matchingCategoryIds,
    );
    return null;
  }
  const excludedIds = new Set((joinedRowsResult.data ?? []).map((row) => row.party_id));

  let query = supabase
    .from("parties")
    .select(SELECT_COLUMNS)
    .neq("organiser_id", userId)
    .gte("time_start", new Date().toISOString())
    .order("time_start")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "parties_tags" });

  if (text) {
    const { data: partyIds, error: rpcError } = await supabase.rpc("search_party_ids", {
      search_text: text,
      tag_ids: matchingTagIds,
    });
    if (rpcError) {
      console.error("[queries.searchParties]: ", rpcError);
      return null;
    }
    const ids = partyIds ?? [];
    if (ids.length === 0) return { parties: [], hasMore: false, nextOffset: offset };
    // PostgREST GET URLs fail to parse beyond roughly 8KB; ~200 UUIDs is a
    // safe ceiling for the in() filter.
    const cappedIds = ids.slice(0, 200);
    query = query.in("id", cappedIds);
    textOrder = ids;
  }

  if (filters.category?.length) {
    if (matchingCategoryIds.length === 0) {
      return { parties: [], hasMore: false, nextOffset: offset };
    }
    query = query.in("category_id", matchingCategoryIds);
  }

  if (filters.area?.length) {
    const quotedAreas = filters.area.map((a) => JSON.stringify(`%${a}%`));
    query = query.or(quotedAreas.map((a) => `location.ilike.${a}`).join(","));
  }

  if (filters.budgetMax !== undefined) {
    query = query.or(`estimated_cost.lte.${filters.budgetMax},estimated_cost.is.null`);
  }

  if (excludedIds.size > 0) {
    query = query.not("id", "in", `(${Array.from(excludedIds).join(",")})`);
  }

  if (filters.minSpots !== undefined) {
    // slots_left is NULL for unlimited groups and NULL >= X evaluates to
    // NULL, so unlimited parties must be matched explicitly.
    query = query.or(`slots_left.gte.${filters.minSpots},slots_left.is.null`);
  }

  const dayClauses = buildDayClauses(filters.dayWithin ?? []);
  if (dayClauses.length > 0) {
    query = query.or(dayClauses.join(","));
  }

  const { data, error } = await query.range(offset, offset + limit);
  if (error) {
    console.error("[queries.searchParties]: ", error);
    return null;
  }

  const rawRows = (data as unknown as PartyResult[]).map(mapPartySummary);
  let mapped = rawRows;

  if (filters.timeOfDay?.length) {
    mapped = mapped.filter((party) =>
      filters.timeOfDay!.some((slot) => matchesBangkokHour(party, slot)),
    );
  }
  return {
    parties: mapped,
    hasMore: rawRows.length > limit,
    nextOffset: offset + rawRows.length,
    ...(textOrder ? { textOrder } : {}),
  };
}

async function getMatchingTagIds(
  supabase: SupabaseClient<Database>,
  text: string | undefined,
): Promise<string[] | null> {
  if (!text) return [];
  // Exact (case-insensitive) tag name match: substring tag matching made
  // catch-all tags like "Other" pollute unrelated searches ("the" ⊂ "Other").
  const { data, error } = await supabase.from("tags").select("id").ilike("name", text).limit(500);
  if (error) {
    console.error("[queries.searchParties]: ", error);
    return null;
  }
  return (data ?? []).map((tag) => tag.id);
}

async function getCategoryIds(
  supabase: SupabaseClient<Database>,
  names: string[] | undefined,
): Promise<string[] | null> {
  if (!names?.length) return [];
  const { data, error } = await supabase.from("party_categories").select("id").in("name", names);
  if (error) {
    console.error("[queries.searchParties]: ", error);
    return null;
  }
  return (data ?? []).map((category) => category.id);
}
