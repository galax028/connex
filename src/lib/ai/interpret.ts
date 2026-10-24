import { inferArea } from "@/lib/areas";
import type { DayWithin, PartyFilters, SortOption, TimeOfDay } from "@/lib/filters";
import {
  bangkokDayKey,
  bangkokHour,
  bangkokWeekday,
  daysFromToday,
  formatBudget,
  isPast,
  plural,
  spotsLeft,
} from "@/lib/format";
import { approvedParticipants } from "@/lib/participants";
import type { PartySummary, ProfileSummary } from "@/lib/supabase/queries/types";

/**
 * Prototype note: this module *simulates* natural-language interpretation with
 * rule-based heuristics so the UI can be demoed without a live model. A real
 * OpenRouter call would replace `interpretQuery` only — the chip/filter/result
 * pipeline stays unchanged.
 */

export type ChipField =
  "category" | "dayWithin" | "timeOfDay" | "budgetMax" | "area" | "minSpots" | "keyword";

export interface InterpretationChip {
  id: string;
  field: ChipField;
  label: string;
  value: string;
}

export interface Interpretation {
  filters: PartyFilters;
  chips: InterpretationChip[];
  notes: string[];
}

/** Keys are DB category names (`party_categories.name`). */
const CATEGORY_WORDS: Record<string, string[]> = {
  Sports: [
    "badminton",
    "แบด",
    "ตีแบด",
    "football",
    "ฟุตบอล",
    "basketball",
    "บาส",
    "running",
    "วิ่ง",
    "muay",
    "มวย",
    "volleyball",
    "วอลเลย์",
    "bowling",
    "โบว์ลิ่ง",
    "gym",
    "fitness",
    "tennis",
    "swim",
    "ว่ายน้ำ",
    "sport",
    "กีฬา",
  ],
  Food: [
    "food",
    "กิน",
    "ข้าว",
    "หมูกระทะ",
    "hotpot",
    "สุกี้",
    "bbq",
    "บุฟเฟ่ต์",
    "buffet",
    "ชานม",
    "bubble tea",
    "dessert",
    "ขนม",
    "restaurant",
    "ร้านอาหาร",
    "sushi",
    "ramen",
    "กะเพรา",
    "ส้มตำ",
    "k-bbq",
    "หารกิน",
    "มื้อ",
  ],
  Gaming: [
    "game",
    "เกม",
    "valorant",
    "lol",
    "league",
    "board game",
    "บอร์ดเกม",
    "dota",
    "playstation",
    "switch",
    "esport",
    "gaming",
    "minecraft",
    "genshin",
  ],
  Studying: [
    "study",
    "ติว",
    "สอบ",
    "exam",
    "อ่านหนังสือ",
    "ห้องสมุด",
    "library",
    "homework",
    "การบ้าน",
    "assignment",
    "cram",
    "project",
    "งานกลุ่ม",
    "final",
  ],
  Arts: [
    "movie",
    "หนัง",
    "cinema",
    "photo",
    "ถ่ายรูป",
    "art",
    "ศิลปะ",
    "draw",
    "วาด",
    "museum",
    "พิพิธภัณฑ์",
    "craft",
    "ghibli",
  ],
  Music: [
    "karaoke",
    "คาราโอเกะ",
    "sing",
    "ร้องเพลง",
    "concert",
    "คอนเสิร์ต",
    "music",
    "เพลง",
    "guitar",
    "กีตาร์",
    "band",
  ],
  Sightseeing: [
    "hike",
    "เดินป่า",
    "travel",
    "เที่ยว",
    "market",
    "ตลาดนัด",
    "walk",
    "เดินเล่น",
    "park",
    "สวน",
    "bike",
    "จักรยาน",
    "trip",
    "beach",
    "ทะเล",
  ],
  Other: [],
};

const DAY_WORDS: Array<[DayWithin, string[]]> = [
  ["today", ["today", "tonight", "วันนี้", "คืนนี้", "เย็นนี้"]],
  ["tomorrow", ["tomorrow", "พรุ่งนี้"]],
  [
    "weekend",
    ["weekend", "สุดสัปดาห์", "เสาร์อาทิตย์", "saturday", "sunday", "เสาร์", "อาทิตย์นี้"],
  ],
  ["this_week", ["this week", "สัปดาห์นี้", "อาทิตย์นี้", "next week", "สัปดาห์หน้า"]],
];

const TIME_WORDS: Array<[TimeOfDay, string[]]> = [
  ["morning", ["morning", "เช้า"]],
  ["afternoon", ["afternoon", "บ่าย", "เที่ยง"]],
  ["evening", ["evening", "เย็น", "ค่ำ", "night", "คืน", "ดึก"]],
];

const AREA_WORDS: Array<[string, string[]]> = [
  ["On campus", ["campus", "จุฬา", "chula", "มหาลัย", "ออนแคมปัส", "on campus", "ลาน", "อาคาร"]],
  ["Sam Yan", ["sam yan", "สามย่าน", "มิ้นท์ทาวน์", "mitrtown"]],
  ["Siam", ["siam", "สยาม", "สยามสแควร์", "paragon", "MBK"]],
  ["Ari", ["ari", "อารีย์", "อารี"]],
  ["Silom", ["silom", "สีลม", "ลุมพินี"]],
  ["Sukhumvit", ["sukhumvit", "สุขุมวิท", "เบญจกิตติ", "benjakitti", "asok"]],
  ["Chatuchak", ["chatuchak", "จตุจักร", "ตลาดจตุ", "รัชดา"]],
  ["Phra Nakhon", ["phra nakhon", "พระนคร", "old town", "เมืองเก่า", "เกาะ", "ข้าวสาร"]],
];

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "with",
  "at",
  "in",
  "on",
  "to",
  "of",
  "me",
  "my",
  "we",
  "us",
  "i",
  "want",
  "wanna",
  "looking",
  "find",
  "anyone",
  "any",
  "who",
  "can",
  "join",
  "does",
  "do",
  "is",
  "are",
  "this",
  "that",
  "under",
  "over",
  "near",
  "around",
  "about",
  "free",
  "baht",
  "people",
  "person",
  "something",
  "anything",
  "activity",
  "activities",
  "budget",
  "กลุ่ม",
  "หา",
  "รบกวน",
  "ใคร",
  "อยาก",
  "ไป",
  "มา",
  "กับ",
  "เรา",
  "ฉัน",
  "ผม",
  "ช่วย",
  "ด้วย",
  "กัน",
  "คน",
  "ที่",
  "และ",
  "หรือ",
  "เลย",
  "นะ",
  "ค่ะ",
  "ครับ",
  "ฟรี",
  "บาท",
  "งบ",
  "กิจกรรม",
  "อะไร",
  "อะไรก็ได้",
  "อะไรก็ได้แหละ",
]);

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/** Returns the first matched dictionary term, for keyword-stripping. */
function firstMatch(haystack: string, needles: string[]): string | undefined {
  for (const needle of needles) {
    if (haystack.includes(needle.toLowerCase())) return needle;
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBudget(text: string): number | undefined {
  const cues = [
    /(?:under|below|max|less than|not over|ไม่เกิน|งบ(?:ไม่เกิน)?|ประมาณ|around)\s*(?:฿|baht|บาท)?\s*(\d{2,5})/i,
    /(?:งบ|budget)\s*(?:\d{2,5})/i,
    /(?:฿|บาท|baht)\s*(\d{2,5})/i,
    /(\d{2,5})\s*(?:฿|baht|บาท)/i,
  ];
  for (const re of cues) {
    const m = text.match(re);
    if (m?.[1]) return Number(m[1]);
  }
  if (/\bfree\b|ฟรี/.test(text)) return 0;
  return undefined;
}

function extractMinPeople(text: string): number | undefined {
  const m =
    text.match(/(?:group of|we are|there are|พวกเรา|เรา)\s*(\d{1,2})\s*(?:people|คน)?/i) ??
    text.match(/(\d{1,2})\s*(?:people|คน)/i);
  if (m?.[1]) {
    const n = Number(m[1]);
    if (n >= 2 && n <= 20) return n;
  }
  return undefined;
}

function extractKeywords(text: string): string[] {
  // \p{M} keeps Thai vowels/tone marks attached to their word.
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}\p{M}]+/gu) ?? [];
  return tokens.filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)).slice(0, 6);
}

export function interpretQuery(rawQuery: string): Interpretation {
  const q = rawQuery.toLowerCase();
  const filters: PartyFilters = {};
  const chips: InterpretationChip[] = [];
  const notes: string[] = [];
  // Terms the dictionaries consumed — stripped before keyword extraction so
  // Thai compound tokens don't resurface as redundant keyword chips.
  const consumed: string[] = [];

  const categories = Object.keys(CATEGORY_WORDS).filter((c) => includesAny(q, CATEGORY_WORDS[c]));
  if (categories.length > 0) {
    const term = firstMatch(q, CATEGORY_WORDS[categories[0]]);
    if (term) consumed.push(term);
    if (categories.length > 1)
      notes.push("Several categories matched — remove the ones you don't want.");
    for (const category of categories) {
      chips.push({
        id: `category-${category}`,
        field: "category",
        label: category,
        value: category,
      });
    }
    filters.category = categories;
    // Keep specific activities ("แบด", "karaoke") as an extra keyword chip so
    // the category chip alone doesn't blur e.g. badminton into all sports.
    const GENERIC_TERMS = new Set([
      "sport",
      "sports",
      "กีฬา",
      "food",
      "ข้าว",
      "game",
      "games",
      "เกม",
      "study",
      "studying",
      "art",
      "arts",
      "music",
      "เพลง",
      "travel",
    ]);
    if (term && !GENERIC_TERMS.has(term.toLowerCase()) && term.trim().length >= 2) {
      chips.push({
        id: "kw-focus",
        field: "keyword",
        label: `“${term.toLowerCase()}”`,
        value: term.toLowerCase(),
      });
    }
  }

  const days = DAY_WORDS.filter(([, words]) => includesAny(q, words));
  if (days.length > 0) {
    const term = firstMatch(q, days[0][1]);
    if (term) consumed.push(term);
    if (days.length > 1) notes.push("Several time windows matched — keep the ones you want.");
    for (const [day] of days) {
      chips.push({
        id: `dayWithin-${day}`,
        field: "dayWithin",
        label: day.replace("_", " "),
        value: day,
      });
    }
    filters.dayWithin = days.map(([day]) => day);
  }

  const times = TIME_WORDS.filter(([, words]) => includesAny(q, words));
  if (times.length > 0) {
    const term = firstMatch(q, times[0][1]);
    if (term) consumed.push(term);
    for (const [time] of times) {
      chips.push({ id: `timeOfDay-${time}`, field: "timeOfDay", label: time, value: time });
    }
    filters.timeOfDay = times.map(([time]) => time);
  }

  const budget = extractBudget(q);
  if (budget !== undefined) {
    const budgetMatch = q.match(
      /(?:under|below|max|less than|not over|ไม่เกิน|งบ(?:ไม่เกิน)?|ประมาณ|around)\s*(?:฿|baht|บาท)?\s*\d{2,5}|(?:฿|บาท|baht)\s*\d{2,5}|\d{2,5}\s*(?:฿|baht|บาท)|\bfree\b|ฟรี|(?:งบ|budget)\s*\d{2,5}/i,
    );
    if (budgetMatch) consumed.push(budgetMatch[0]);
    filters.budgetMax = budget;
    chips.push({
      id: "budgetMax",
      field: "budgetMax",
      label: budget === 0 ? "Free only" : `≤ ${formatBudget(budget)}`,
      value: String(budget),
    });
  }

  const areas = AREA_WORDS.filter(([, words]) => includesAny(q, words));
  if (areas.length > 0) {
    const term = firstMatch(q, areas[0][1]);
    if (term) consumed.push(term);
    for (const [area] of areas) {
      chips.push({ id: `area-${area}`, field: "area", label: area, value: area });
    }
    filters.area = areas.map(([area]) => area);
  }

  const people = extractMinPeople(q);
  if (people !== undefined) {
    const peopleMatch =
      q.match(/(?:group of|we are|there are|พวกเรา|เรา)\s*\d{1,2}\s*(?:people|คน)?/i) ??
      q.match(/\d{1,2}\s*(?:people|คน)/i);
    if (peopleMatch) consumed.push(peopleMatch[0]);
    filters.minSpots = people;
    chips.push({
      id: "minSpots",
      field: "minSpots",
      label: `Room for ${people}`,
      value: String(people),
    });
  }

  let remainder = rawQuery;
  for (const term of consumed) {
    remainder = remainder.replace(new RegExp(escapeRegExp(term), "gi"), " ");
  }
  const keywords = extractKeywords(remainder);
  for (const [i, kw] of keywords.entries()) {
    chips.push({ id: `kw-${i}`, field: "keyword", label: `“${kw}”`, value: kw });
  }
  filters.text = keywords.join(" ") || undefined;

  if (chips.length === 0) {
    notes.push(
      "Prototype could not identify concrete constraints from that. Showing everything — try mentioning a category, day, area or budget.",
    );
  } else {
    notes.push("Simulated interpretation (prototype, not live AI) — edit or remove any chip.");
  }

  return { filters, chips, notes };
}

/* ------------------------------ filter helpers ----------------------------- */

export function partyMatchesDay(
  party: PartySummary,
  dayWithin: DayWithin,
  now = Date.now(),
): boolean {
  const start = new Date(party.timeStart).getTime();
  if (start < now - 60_000) return false;
  switch (dayWithin) {
    case "today":
      return bangkokDayKey(party.timeStart) === daysFromToday(0);
    case "tomorrow":
      return bangkokDayKey(party.timeStart) === daysFromToday(1);
    case "weekend": {
      const day = bangkokWeekday(party.timeStart);
      const withinWeek = start - now <= 7 * 86_400_000;
      return withinWeek && (day === 6 || day === 0);
    }
    case "this_week":
      return start - now <= 7 * 86_400_000;
  }
}

export function partyMatchesTimeOfDay(party: PartySummary, timeOfDay: TimeOfDay): boolean {
  const hour = bangkokHour(party.timeStart);
  if (timeOfDay === "morning") return hour < 12;
  if (timeOfDay === "afternoon") return hour >= 12 && hour < 17;
  return hour >= 17;
}

export function partyMatchesArea(party: PartySummary, area: string): boolean {
  const needle = area.toLowerCase();
  return (
    inferArea(party.location).toLowerCase().includes(needle) ||
    party.location.toLowerCase().includes(needle)
  );
}

export function partyMatchesText(party: PartySummary, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = [
    party.title,
    party.description ?? "",
    party.location,
    inferArea(party.location),
    party.tags.map((tag) => tag.name).join(" "),
    party.categoryName ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return keywords.every((kw) => haystack.includes(kw.toLowerCase()));
}

/** Effective cost for filter comparisons: NULL (free) counts as 0. */
function partyCost(party: PartySummary): number {
  return party.budgetPerPerson ?? 0;
}

/**
 * Search results are "discoverable" parties: upcoming, not created by the user,
 * and not already joined or requested (those live in My Activities instead).
 */
export function applyFilters(
  parties: PartySummary[],
  filters: PartyFilters,
  viewerId: string,
  now = Date.now(),
): PartySummary[] {
  const keywords = (filters.text ?? "").split(" ").filter(Boolean);
  return parties.filter((party) => {
    if (party.organiserId === viewerId) return false;
    if (party.participants.some((p) => p.id === viewerId)) return false;
    if (isPast(party.timeStart, now)) return false;
    if (filters.category?.length && !filters.category.includes(party.categoryName ?? ""))
      return false;
    if (
      filters.dayWithin?.length &&
      !filters.dayWithin.some((day) => partyMatchesDay(party, day, now))
    )
      return false;
    if (
      filters.timeOfDay?.length &&
      !filters.timeOfDay.some((slot) => partyMatchesTimeOfDay(party, slot))
    )
      return false;
    if (filters.budgetMax !== undefined && partyCost(party) > filters.budgetMax) return false;
    if (filters.minSpots !== undefined) {
      const accepted = approvedParticipants(party).length;
      if (spotsLeft(party.maxSlots, accepted) < filters.minSpots) return false;
    }
    if (filters.area?.length && !filters.area.some((area) => partyMatchesArea(party, area)))
      return false;
    return partyMatchesText(party, keywords);
  });
}

/* --------------------------- ranking & explanations ------------------------- */

export interface RankedParty {
  party: PartySummary;
  score: number;
  reasons: string[];
}

/**
 * Reasons are derived deterministically from retrieved fields only — never
 * invented.
 */
export function rankMatches(
  parties: PartySummary[],
  filters: PartyFilters,
  viewer: ProfileSummary | undefined,
  now = Date.now(),
): RankedParty[] {
  const keywords = (filters.text ?? "").split(" ").filter(Boolean);
  const viewerTags = new Set((viewer?.tags ?? []).map((tag) => tag.name.toLowerCase()));

  const ranked = parties.map((party) => {
    const reasons: string[] = [];
    let score = 0;

    if (filters.category?.includes(party.categoryName ?? "")) {
      score += 30;
      reasons.push(`Matches ${party.categoryName}`);
    }
    for (const kw of keywords) {
      if (partyMatchesText(party, [kw])) {
        score += 10;
        reasons.push(`Mentions “${kw}”`);
      }
    }
    if (filters.budgetMax !== undefined) {
      if (partyCost(party) <= filters.budgetMax) {
        score += 6;
        reasons.push(
          party.budgetPerPerson === null
            ? "Free activity"
            : `Within budget (${formatBudget(party.budgetPerPerson)} ≤ ${formatBudget(filters.budgetMax)})`,
        );
      } else {
        score -= 40;
      }
    }
    const matchedDay = filters.dayWithin?.find((day) => partyMatchesDay(party, day, now));
    if (matchedDay) {
      score += 8;
      reasons.push(`Happens ${matchedDay.replace("_", " ")}`);
    }
    const matchedTime = filters.timeOfDay?.find((slot) => partyMatchesTimeOfDay(party, slot));
    if (matchedTime) {
      score += 4;
      reasons.push(`${matchedTime} time slot`);
    }
    const matchedArea = filters.area?.find((area) => partyMatchesArea(party, area));
    if (matchedArea) {
      score += 8;
      reasons.push(`In ${inferArea(party.location)}`);
    }
    const overlap = party.tags.filter((tag) => viewerTags.has(tag.name.toLowerCase()));
    if (overlap.length > 0) {
      score += 8 * Math.min(overlap.length, 2);
      reasons.push(`Shares your interest: ${overlap[0].name}`);
    }
    const accepted = approvedParticipants(party).length;
    const left = spotsLeft(party.maxSlots, accepted);
    if (!Number.isFinite(left)) {
      reasons.push("Open group — no size limit");
      score += 2;
    } else if (left > 0) {
      reasons.push(`${plural(left, "spot", "spots")} left`);
      if (left <= 2) score += 3;
    }
    score += accepted; // mild popularity boost

    return { party, score, reasons: reasons.slice(0, 3) };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

export function sortParties(
  parties: PartySummary[],
  sort: SortOption,
  ranked?: Map<string, number>,
): PartySummary[] {
  const copy = [...parties];
  if (sort === "soonest") {
    return copy.sort((a, b) => new Date(a.timeStart).getTime() - new Date(b.timeStart).getTime());
  }
  if (sort === "popularity") {
    return copy.sort((a, b) => approvedParticipants(b).length - approvedParticipants(a).length);
  }
  return copy.sort((a, b) => (ranked?.get(b.id) ?? 0) - (ranked?.get(a.id) ?? 0));
}

/* ------------------------------ chip editing ------------------------------- */

export const CHIP_CYCLES: Partial<Record<ChipField, string[]>> = {
  dayWithin: ["today", "tomorrow", "weekend", "this_week"],
  timeOfDay: ["morning", "afternoon", "evening"],
  budgetMax: ["100", "200", "300", "500", "0"],
};

export function chipLabelFor(field: ChipField, value: string): string {
  switch (field) {
    case "category":
      return value;
    case "dayWithin":
      return value.replace("_", " ");
    case "budgetMax": {
      const n = Number(value);
      return n === 0 ? "Free only" : `≤ ${formatBudget(n)}`;
    }
    case "minSpots":
      return `Room for ${value}`;
    case "keyword":
      return `“${value}”`;
    default:
      return value;
  }
}

/** Rebuilds filters from the current chip list (single source of truth). */
export function filtersFromChips(chips: InterpretationChip[]): PartyFilters {
  const filters: PartyFilters = {};
  for (const chip of chips) {
    switch (chip.field) {
      case "category":
        filters.category = [...(filters.category ?? []), chip.value];
        break;
      case "dayWithin":
        filters.dayWithin = [...(filters.dayWithin ?? []), chip.value as DayWithin];
        break;
      case "timeOfDay":
        filters.timeOfDay = [...(filters.timeOfDay ?? []), chip.value as TimeOfDay];
        break;
      case "budgetMax":
        filters.budgetMax = Number(chip.value);
        break;
      case "area":
        filters.area = [...(filters.area ?? []), chip.value];
        break;
      case "minSpots":
        filters.minSpots = Number(chip.value);
        break;
      case "keyword":
        filters.text = [filters.text, chip.value].filter(Boolean).join(" ");
        break;
    }
  }
  return filters;
}
