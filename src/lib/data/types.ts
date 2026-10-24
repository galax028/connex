export const CATEGORIES = [
  "sports",
  "food",
  "gaming",
  "studying",
  "arts",
  "music",
  "outdoor",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  sports: "Sports",
  food: "Food",
  gaming: "Gaming",
  studying: "Studying",
  arts: "Arts",
  music: "Music",
  outdoor: "Outdoor",
  other: "Other",
};

export type ParticipantStatus = "accepted" | "requested";

export interface Participant {
  profileId: string;
  status: ParticipantStatus;
  joinedAt: string;
}

export interface Profile {
  id: string;
  name: string;
  faculty: string;
  year: string;
  bio: string;
  interests: string[];
  initials: string;
  color: string;
}

/** Exact geographic spot chosen on a map (WGS 84 decimal degrees). */
export interface MapPin {
  lat: number;
  lng: number;
}

export interface Party {
  id: string;
  title: string;
  description: string;
  category: Category;
  date: string;
  time: string;
  /** Optional ending time, same day as `time`. */
  endTime?: string;
  location: string;
  area: string;
  /** Optional exact meeting spot dropped on a map by the host. */
  locationPin?: MapPin;
  budgetPerPerson: number;
  /** Max confirmed members including the host. null = unlimited. */
  capacity: number | null;
  /** When true, joiners must be approved by the host; false = instant join. */
  requiresApproval: boolean;
  creatorId: string;
  participants: Participant[];
  interests: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  partyId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type MyStatus = "none" | "requested" | "joined" | "creator";

export type SortOption = "relevance" | "soonest" | "popularity";

export type DayWithin = "today" | "tomorrow" | "this_week" | "weekend";

export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface PartyFilters {
  category?: Category;
  dayWithin?: DayWithin;
  timeOfDay?: TimeOfDay;
  budgetMax?: number;
  minSpots?: number;
  area?: string;
  text?: string;
}
