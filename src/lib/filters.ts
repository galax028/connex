export type SortOption = "relevance" | "soonest" | "popularity";

export type DayWithin = "today" | "tomorrow" | "this_week" | "weekend";

export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface PartyFilters {
  /** DB category names (e.g. "Food"); empty/undefined = any. */
  category?: string[];
  /** Day-window tags; a party matches when it fits any selected window. */
  dayWithin?: DayWithin[];
  timeOfDay?: TimeOfDay[];
  budgetMax?: number;
  minSpots?: number;
  /** Area tags; a party matches when its location hits any selected area. */
  area?: string[];
  text?: string;
}

/** Exact geographic spot on a map (WGS 84 decimal degrees). */
export interface MapPin {
  lat: number;
  lng: number;
}
