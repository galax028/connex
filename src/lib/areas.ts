/**
 * The DB has no area column — area stays a UI-derived concept, guessed from
 * the meeting-point text. Never stored, always computed at render time.
 */

export const AREA_HINTS: Array<[area: string, words: string[]]> = [
  ["On campus", ["cu sport", "chula", "campus", "จุฬา", "l building", "engineering", " cu "]],
  ["Sam Yan", ["sam yan", "mitrtown", "สามย่าน"]],
  ["Siam", ["siam", "paragon", "mbk", "สยาม"]],
  ["Ari", ["ari", "อารีย์"]],
  ["Silom", ["silom", "สีลม"]],
  ["Sukhumvit", ["sukhumvit", "benjakitti", "asok", "สุขุมวิท"]],
  ["Chatuchak", ["chatuchak", "จตุจักร", "esplanade"]],
  ["Phra Nakhon", ["phra nakhon", "khao san", "พระนคร", "old town"]],
];

export function inferArea(location: string): string {
  const l = location.toLowerCase();
  for (const [area, words] of AREA_HINTS) {
    if (words.some((word) => l.includes(word))) return area;
  }
  return "Elsewhere";
}
