import type {
  Category,
  DayWithin,
  Party,
  PartyFilters,
  Profile,
  SortOption,
  TimeOfDay,
} from "@/lib/data/types";
import { CATEGORY_LABELS } from "@/lib/data/types";
import {
  combineDateTime,
  daysFromToday,
  formatBudget,
  isPast,
  plural,
  spotsLeft,
  toDateKey,
} from "../format";

/**
 * Prototype note: this module *simulates* natural-language interpretation with
 * rule-based heuristics so the UI can be demoed without a live model. A real
 * OpenRouter call would replace `interpretQuery` only — the chip/filter/result
 * pipeline stays unchanged.
 */

export type ChipField =
  | "category"
  | "dayWithin"
  | "timeOfDay"
  | "budgetMax"
  | "area"
  | "minSpots"
  | "keyword";

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

const CATEGORY_WORDS: Record<Category, string[]> = {
  sports: [
    "badminton", "แบด", "ตีแบด", "football", "ฟุตบอล", "basketball", "บาส",
    "running", "วิ่ง", "muay", "มวย", "volleyball", "วอลเลย์", "bowling",
    "โบว์ลิ่ง", "gym", "fitness", "tennis", "swim", "ว่ายน้ำ", "sport", "กีฬา",
  ],
  food: [
    "food", "กิน", "ข้าว", "หมูกระทะ", "hotpot", "สุกี้", "bbq", "บุฟเฟ่ต์",
    "buffet", "ชานม", "bubble tea", "dessert", "ขนม", "restaurant", "ร้านอาหาร",
    "sushi", "ramen", "กะเพรา", "ส้มตำ", "k-bbq", "หารกิน", "มื้อ",
  ],
  gaming: [
    "game", "เกม", "valorant", "lol", "league", "board game", "บอร์ดเกม",
    "dota", "playstation", "switch", "esport", "gaming", "minecraft", "genshin",
  ],
  studying: [
    "study", "ติว", "สอบ", "exam", "อ่านหนังสือ", "ห้องสมุด", "library",
    "homework", "การบ้าน", "assignment", "cram", "project", "งานกลุ่ม", "final",
  ],
  arts: [
    "movie", "หนัง", "cinema", "photo", "ถ่ายรูป", "art", "ศิลปะ", "draw",
    "วาด", "museum", "พิพิธภัณฑ์", "craft", "ghibli",
  ],
  music: [
    "karaoke", "คาราโอเกะ", "sing", "ร้องเพลง", "concert", "คอนเสิร์ต",
    "music", "เพลง", "guitar", "กีตาร์", "band",
  ],
  outdoor: [
    "hike", "เดินป่า", "travel", "เที่ยว", "market", "ตลาดนัด", "walk",
    "เดินเล่น", "park", "สวน", "bike", "จักรยาน", "trip", "beach", "ทะเล",
  ],
  other: [],
};

const DAY_WORDS: Array<[DayWithin, string[]]> = [
  ["today", ["today", "tonight", "วันนี้", "คืนนี้", "เย็นนี้"]],
  ["tomorrow", ["tomorrow", "พรุ่งนี้"]],
  ["weekend", ["weekend", "สุดสัปดาห์", "เสาร์อาทิตย์", "saturday", "sunday", "เสาร์", "อาทิตย์นี้"]],
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
  "the", "a", "an", "and", "or", "for", "with", "at", "in", "on", "to", "of",
  "me", "my", "we", "us", "i", "want", "wanna", "looking", "find", "anyone",
  "any", "who", "can", "join", "does", "do", "is", "are", "this", "that",
  "under", "over", "near", "around", "about", "free", "baht", "people",
  "person", "something", "anything", "activity", "activities", "budget",
  "กลุ่ม", "หา", "รบกวน", "ใคร", "อยาก", "ไป", "มา", "กับ", "เรา", "ฉัน", "ผม",
  "ช่วย", "ด้วย", "กัน", "คน", "ที่", "และ", "หรือ", "เลย", "นะ", "ค่ะ", "ครับ",
  "ฟรี", "บาท", "งบ", "กิจกรรม", "อะไร", "อะไรก็ได้", "อะไรก็ได้แหละ",
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
  return tokens
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .slice(0, 6);
}

export function interpretQuery(rawQuery: string): Interpretation {
  const q = rawQuery.toLowerCase();
  const filters: PartyFilters = {};
  const chips: InterpretationChip[] = [];
  const notes: string[] = [];
  // Terms the dictionaries consumed — stripped before keyword extraction so
  // Thai compound tokens don't resurface as redundant keyword chips.
  const consumed: string[] = [];

  const categories = (Object.keys(CATEGORY_WORDS) as Category[]).filter((c) =>
    includesAny(q, CATEGORY_WORDS[c])
  );
  if (categories.length > 0) {
    const term = firstMatch(q, CATEGORY_WORDS[categories[0]]);
    if (term) consumed.push(term);
    if (categories.length > 1)
      notes.push(
        `Several categories matched — using ${CATEGORY_LABELS[categories[0]]}. Remove the chip to widen.`
      );
    filters.category = categories[0];
    chips.push({
      id: "category",
      field: "category",
      label: CATEGORY_LABELS[categories[0]],
      value: categories[0],
    });
    // Keep specific activities ("แบด", "karaoke") as an extra keyword chip so
    // the category chip alone doesn't blur e.g. badminton into all sports.
    const GENERIC_TERMS = new Set([
      "sport", "sports", "กีฬา", "food", "ข้าว", "game", "games", "เกม",
      "study", "studying", "art", "arts", "music", "เพลง", "travel",
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
    if (days.length > 1)
      notes.push(`Several time hints found — using "${days[0][0].replace("_", " ")}".`);
    filters.dayWithin = days[0][0];
    chips.push({
      id: "dayWithin",
      field: "dayWithin",
      label: days[0][0].replace("_", " "),
      value: days[0][0],
    });
  }

  const times = TIME_WORDS.filter(([, words]) => includesAny(q, words));
  if (times.length > 0) {
    const term = firstMatch(q, times[0][1]);
    if (term) consumed.push(term);
    filters.timeOfDay = times[0][0];
    chips.push({
      id: "timeOfDay",
      field: "timeOfDay",
      label: times[0][0],
      value: times[0][0],
    });
  }

  const budget = extractBudget(q);
  if (budget !== undefined) {
    const budgetMatch = q.match(
      /(?:under|below|max|less than|not over|ไม่เกิน|งบ(?:ไม่เกิน)?|ประมาณ|around)\s*(?:฿|baht|บาท)?\s*\d{2,5}|(?:฿|บาท|baht)\s*\d{2,5}|\d{2,5}\s*(?:฿|baht|บาท)|\bfree\b|ฟรี|(?:งบ|budget)\s*\d{2,5}/i
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
    filters.area = areas[0][0];
    chips.push({ id: "area", field: "area", label: areas[0][0], value: areas[0][0] });
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
      "Prototype could not identify concrete constraints from that. Showing everything — try mentioning a category, day, area or budget."
    );
  } else {
    notes.push("Simulated interpretation (prototype, not live AI) — edit or remove any chip.");
  }

  return { filters, chips, notes };
}

/* ------------------------------ filter helpers ----------------------------- */

export function partyMatchesDay(party: Party, dayWithin: DayWithin, now = new Date()): boolean {
  const start = combineDateTime(party.date, party.time);
  if (start.getTime() < now.getTime() - 60_000) return false;
  const todayKey = toDateKey(now);
  const partyDay = party.date;
  switch (dayWithin) {
    case "today":
      return partyDay === todayKey;
    case "tomorrow":
      return partyDay === daysFromToday(1);
    case "weekend": {
      const day = start.getDay();
      const withinWeek = start.getTime() - now.getTime() <= 7 * 86400_000;
      return withinWeek && (day === 6 || day === 0);
    }
    case "this_week":
      return start.getTime() - now.getTime() <= 7 * 86400_000;
  }
}

export function partyMatchesTimeOfDay(party: Party, timeOfDay: TimeOfDay): boolean {
  const hour = Number(party.time.split(":")[0]);
  if (timeOfDay === "morning") return hour < 12;
  if (timeOfDay === "afternoon") return hour >= 12 && hour < 17;
  return hour >= 17;
}

export function partyMatchesText(party: Party, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = [
    party.title,
    party.description,
    party.location,
    party.area,
    party.interests.join(" "),
    party.category,
  ]
    .join(" ")
    .toLowerCase();
  return keywords.every((kw) => haystack.includes(kw.toLowerCase()));
}

/**
 * Search results are "discoverable" parties: upcoming, not created by the user,
 * and not already joined or requested (those live in My Activities instead).
 */
export function applyFilters(
  parties: Party[],
  filters: PartyFilters,
  now = new Date()
): Party[] {
  const keywords = (filters.text ?? "").split(" ").filter(Boolean);
  return parties.filter((party) => {
    if (party.creatorId === "me") return false;
    if (party.participants.some((p) => p.profileId === "me")) return false;
    if (isPast(party.date, party.time, now)) return false;
    if (filters.category && party.category !== filters.category) return false;
    if (filters.dayWithin && !partyMatchesDay(party, filters.dayWithin, now)) return false;
    if (filters.timeOfDay && !partyMatchesTimeOfDay(party, filters.timeOfDay)) return false;
    if (filters.budgetMax !== undefined && party.budgetPerPerson > filters.budgetMax) return false;
    if (filters.minSpots !== undefined) {
      const accepted = party.participants.filter((p) => p.status === "accepted").length;
      if (spotsLeft(party.capacity, accepted) < filters.minSpots) return false;
    }
    if (filters.area) {
      const area = filters.area.toLowerCase();
      if (
        !party.area.toLowerCase().includes(area) &&
        !party.location.toLowerCase().includes(area)
      )
        return false;
    }
    return partyMatchesText(party, keywords);
  });
}

/* --------------------------- ranking & explanations ------------------------- */

export interface RankedParty {
  party: Party;
  score: number;
  reasons: string[];
}

export function rankMatches(
  parties: Party[],
  filters: PartyFilters,
  currentProfile: Profile | undefined,
  now = new Date()
): RankedParty[] {
  const keywords = (filters.text ?? "").split(" ").filter(Boolean);
  const interests = new Set((currentProfile?.interests ?? []).map((i) => i.toLowerCase()));

  const ranked = parties.map((party) => {
    const reasons: string[] = [];
    let score = 0;

    if (filters.category && party.category === filters.category) {
      score += 30;
      reasons.push(`Matches ${CATEGORY_LABELS[party.category]}`);
    }
    for (const kw of keywords) {
      if (partyMatchesText(party, [kw])) {
        score += 10;
        reasons.push(`Mentions “${kw}”`);
      }
    }
    if (filters.budgetMax !== undefined) {
      if (party.budgetPerPerson <= filters.budgetMax) {
        score += 6;
        reasons.push(
          party.budgetPerPerson === 0
            ? "Free activity"
            : `Within budget (${formatBudget(party.budgetPerPerson)} ≤ ${formatBudget(filters.budgetMax)})`
        );
      } else {
        score -= 40;
      }
    }
    if (filters.dayWithin && partyMatchesDay(party, filters.dayWithin, now)) {
      score += 8;
      reasons.push(`Happens ${filters.dayWithin.replace("_", " ")}`);
    }
    if (filters.timeOfDay && partyMatchesTimeOfDay(party, filters.timeOfDay)) {
      score += 4;
      reasons.push(`${filters.timeOfDay} time slot`);
    }
    if (filters.area) {
      const area = filters.area.toLowerCase();
      if (party.area.toLowerCase().includes(area) || party.location.toLowerCase().includes(area)) {
        score += 8;
        reasons.push(`In ${party.area}`);
      }
    }
    const overlap = party.interests.filter((i) => interests.has(i.toLowerCase()));
    if (overlap.length > 0) {
      score += 8 * Math.min(overlap.length, 2);
      reasons.push(`Shares your interest: ${overlap[0]}`);
    }
    const accepted = party.participants.filter((p) => p.status === "accepted").length;
    const left = spotsLeft(party.capacity, accepted);
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
  parties: Party[],
  sort: SortOption,
  ranked?: Map<string, number>
): Party[] {
  const copy = [...parties];
  if (sort === "soonest") {
    return copy.sort(
      (a, b) =>
        combineDateTime(a.date, a.time).getTime() - combineDateTime(b.date, b.time).getTime()
    );
  }
  if (sort === "popularity") {
    return copy.sort(
      (a, b) =>
        b.participants.filter((p) => p.status === "accepted").length -
        a.participants.filter((p) => p.status === "accepted").length
    );
  }
  return copy.sort(
    (a, b) => (ranked?.get(b.id) ?? 0) - (ranked?.get(a.id) ?? 0)
  );
}

/* ------------------------------ chip editing ------------------------------- */

export const CHIP_CYCLES: Partial<Record<ChipField, string[]>> = {
  category: Object.keys(CATEGORY_LABELS),
  dayWithin: ["today", "tomorrow", "weekend", "this week"],
  timeOfDay: ["morning", "afternoon", "evening"],
  budgetMax: ["100", "200", "300", "500", "0"],
};

export function chipLabelFor(field: ChipField, value: string): string {
  switch (field) {
    case "category":
      return CATEGORY_LABELS[value as Category] ?? value;
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
        filters.category = chip.value as Category;
        break;
      case "dayWithin":
        filters.dayWithin = chip.value as DayWithin;
        break;
      case "timeOfDay":
        filters.timeOfDay = chip.value as TimeOfDay;
        break;
      case "budgetMax":
        filters.budgetMax = Number(chip.value);
        break;
      case "area":
        filters.area = chip.value;
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
