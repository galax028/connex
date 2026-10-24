/**
 * Pages Router keeps `getServerSideProps` results in its client-side cache for
 * back/forward navigations, so a list page can briefly show stale counts after
 * a mutation happened on another page (e.g. joining a party on the details
 * page, then going back). Mutation sites mark the data dirty; list pages
 * consume the flag once on mount and re-run `getServerSideProps` when it is
 * still warm. Without the window the flag would loop; with it, one extra
 * server round-trip fixes the stale render.
 */

let lastMutationAt = 0;

export function markDataMutated(): void {
  lastMutationAt = Date.now();
}

export function consumeDataMutated(windowMs = 60_000): boolean {
  if (lastMutationAt === 0 || Date.now() - lastMutationAt > windowMs) return false;
  lastMutationAt = 0;
  return true;
}
