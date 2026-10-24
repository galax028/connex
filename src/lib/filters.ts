export type SortOption = "relevance" | "soonest" | "popularity";

export type DayWithin = "today" | "tomorrow" | "this_week" | "weekend";

export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface PartyFilters {
  /** DB category name (e.g. "Food"); undefined = any. */
  category?: string;
  dayWithin?: DayWithin;
  timeOfDay?: TimeOfDay;
  budgetMax?: number;
  minSpots?: number;
  area?: string;
  text?: string;
}

/** Exact geographic spot on a map (WGS 84 decimal degrees). */
export interface MapPin {
  lat: number;
  lng: number;
}
