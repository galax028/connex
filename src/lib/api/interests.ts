/**
 * Simulated interest-tag API (prototype).
 *
 * In production this would be `GET /api/interests` on the server. For the
 * prototype it resolves locally with a small delay so the UI exercises its
 * loading state; swap the implementation for a real fetch later without
 * touching the calling components.
 */

export const INTEREST_TAGS: string[] = [
  "badminton",
  "football",
  "running",
  "muay thai",
  "volleyball",
  "thai street food",
  "korean food",
  "bubble tea",
  "dessert",
  "coffee",
  "valorant",
  "board games",
  "coding",
  "exam prep",
  "k-pop",
  "karaoke",
  "movies",
  "photography",
  "hiking",
  "language exchange",
];

const NETWORK_DELAY_MS = 400;

export async function fetchInterestTags(): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
  return [...INTEREST_TAGS];
}
