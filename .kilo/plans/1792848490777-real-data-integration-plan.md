# Real-Data Integration Plan (getServerSideProps + user-scoped RLS client)

Wire every page of the CONNEX prototype to real Supabase data using the existing
`src/lib/supabase/queries/*` layer, replacing the mock seed/localStorage store.
Pages Router conventions and all AGENTS.md rules apply (no App Router, no tests).

## Locked decisions

1. **Per-page wiring on real types.** Pages consume `PartySummary` / `PartyDetail` /
   `ProfileSummary` from `src/lib/supabase/queries/types.ts`. Shared components
   (`PartyCard`, `participant-avatar`, `interpret`, `format`, `filter-sheet`,
   `category-chip`) are refactored to those types. No mock-shape adapter layer.
2. **Reads via `getServerSideProps`** with a new **user-scoped cookie client**
   (publishable key + cookie plumbing, RLS enforced). The service-role client
   (`SUPABASE_SECRET_KEY`) stays only in `/api/auth/callback` (and `/api/user` auth check).
3. **Mutations via the browser client** (`createBrowserClient()`) — RLS insert/update/
   delete policies already authorize every mutation. After each mutation the page
   refreshes with `router.replace(router.asPath)` to re-run `getServerSideProps`.
4. **Chat stays local-only** (no messages table). Membership gate comes from real
   party data; messages persist per-browser as today (existing copy already says so).
5. **`parties.taken_slots` — column-scoped app-side writes, migration edited in place.**
   The `parties` UPDATE RLS policy is organiser-only (`update_parties`, migration lines
   197–199), so a joiner's client cannot write `taken_slots` as things stand. Fix is folded
   **into the existing `supabase/migrations/20261024102714_initial_schema.sql`** (user
   explicitly chose in-place edit; no new migration file):
   - `REVOKE UPDATE ON parties FROM authenticated;`
   - `GRANT UPDATE (taken_slots) ON parties TO authenticated;`
   - `CREATE POLICY update_parties_taken_slots ON parties FOR UPDATE TO authenticated
     USING (true) WITH CHECK (true);` — row policy opens all rows, column grants restrict
     writable columns to `taken_slots` only.
   - Keep `update_parties` (organiser) as-is: harmless while privileges are
     column-scoped; widening grants for a future party-edit UI is out of scope.
   App-side rule: after **every** `parties_users` mutation, refetch the party and set
   `taken_slots` to its approved-row count (**recompute-and-set** — never `+1/−1`
   read-modify-write, which loses updates under concurrency). Accepted trade-off: any
   authenticated member can write `taken_slots` values that pass the CHECK — prototype
   level, deliberate consequence of choosing app-side over the trigger.
6. **`get-user.ts` must be created** — `/api/user.ts` already imports it; the missing file
   breaks the build today.

## Schema facts that shape the work

- No `area` column → area stays a UI-derived concept: keep `inferArea(location)` for
  display of presets; never stored.
- `estimated_cost` has `CHECK (> 0)` → **free = NULL**. Display `NULL` as "Free".
- `max_slots` CHECK `>= 2` → create form enforces min 2 for limited crews.
- `approval_status` enum: `pending | approved | declined` ↔ UI `requested | accepted`.
  Decline = **DELETE** the `parties_users` row (mock parity; the re-request RLS policy
  stays unused for now).
- DB category names: `Other, Arts, Food, Gaming, Music, Sightseeing, Sports, Studying`
  → replace the mock `CATEGORIES` union everywhere. "Sightseeing" inherits the icon the
  mock "outdoor" had.
- `parties.location_coordinates point` exists but is not selected by any query → extend
  `getParty` (details page pin). PostgREST point insert/read format (`"lng,lat"` string,
  x=lng y=lat) must be verified at implementation; if it proves problematic, omit the pin
  (non-critical) and note it.
- The organiser is a participant: create flow inserts the organiser's own `parties_users`
  row (`status: 'approved'`), matching `taken_slots` default 1 and the mock's creator card.
- RLS on `parties_users` SELECT returns approved rows of any party + your own pending row +
  all rows of parties you organise. This is exactly what the UI should show — no manual filters.

## Phase 0 — query layer + server auth infra

1. **Edit `supabase/migrations/20261024102714_initial_schema.sql` in place** (after the
   `parties` grants/policies block): the `REVOKE UPDATE` / `GRANT UPDATE (taken_slots)` /
   `update_parties_taken_slots` policy trio from Locked decision 5. **Sync step (operator,
   before testing):** the file is committed — if the linked Supabase project already
   applied this migration, re-sync it (local `supabase db reset`; remote re-apply or
   `supabase migration repair` as applicable); if it was never applied, nothing to do.
   Never reset a shared database without explicit permission.
2. `src/lib/supabase/server.ts`: add `createUserServerClient(req, res)` — same cookie
   plumbing as `createServerClient` but with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   Keep the service-role export untouched.
3. `src/lib/supabase/auth.ts`: drop nothing — keep `getServerUser` (service-role) for the
   API route; gSSP pages call `auth.getUser()` on their own user-scoped instance (see
   Phase 2 pattern), so no separate helper is needed.
4. `src/lib/supabase/queries/get-user.ts` (NEW): `getUser(supabase, userId): UserResult | null`
   — select from `user_profiles` with `faculties(name)` + `users_tags(...tags(id, name))`.
   Relax `UserResult.facultyName` to `string | null` in `queries/types.ts`.
5. Extend the three list queries (`get-parties`, `get-parties-by-organiser`,
   `get-parties-by-participant`) to also select
   `parties_users(user_id, status, created_at, user_profiles(fullname, nickname, profile_url))`
   and map via existing `map-participant.ts`; add `participants: PartyParticipant[]` to
   `PartySummary` (reuse the `PartyDetailResult` shape so `mapPartySummary` serves both).
   This feeds `PartyCard`'s avatar stack and "my status" derivation for lists.
6. `get-tags.ts`: return `{ id: string; name: string }[]` (needed to link `users_tags` /
   `parties_tags` rows by id). Update the type + error log label.
7. `get-party.ts`: add `location_coordinates` to the select; map to `locationPin?: {lat, lng}`
   on `PartySummary` (optional field).

## Phase 1 — shared modules to real types

1. `src/lib/format.ts` → ISO-instant based:
   - `isPast(iso)`, `formatWhen(iso)`, `formatDay(iso)`, `formatTime(iso)`.
   - All `Intl` formatters get `timeZone: "Asia/Bangkok"` so SSR and hydration render
     identically (server TZ is not Bangkok).
   - Bangkok day-key helper (e.g. `bangkokDayKey(iso)`) + `daysFromToday(offset)` in
     Bangkok terms — used by `interpret` (`today/tomorrow/this_week/weekend`).
   - `formatBudgetPerPerson(amount: number | null)` → `NULL` renders "Free".
   - `spotsLeft(maxSlots, acceptedCount)`; keep `plural`, `formatMessageTime`.
   - Add `toBangkokIso(date: string, time: string)` (`${date}T${time}:00+07:00`) for create.
2. `src/lib/data/types.ts` → shrink to `PartyFilters`, `SortOption`, `DayWithin`,
   `TimeOfDay` with `category?: string` (DB names); move to `src/lib/filters.ts`.
   Delete `CATEGORIES`, `CATEGORY_LABELS`, `Party`, `Profile`, `Participant`,
   `ParticipantStatus`, `MyStatus`, `ChatMessage`, `MapPin` mock shapes.
   New helper module `src/lib/participants.ts`:
   `deriveMyStatus(party: PartySummary, userId): "creator" | "joined" | "requested" | "none"`
   (organiser → creator; own approved row → joined; own pending row → requested),
   `approvedParticipants(party)`, `pendingRequests(party)` (filter helpers over `participants`).
3. `src/components/participant-avatar.tsx` → real types: `ParticipantAvatar(profile)` and
   `ParticipantStack(participants: PartyParticipant[])` render `AvatarImage` from
   `profileUrl` (verify `ui/avatar.tsx` exports `AvatarImage`; extend the generated file if
   not) with initials fallback; deterministic color from `id` hash (port `AVATAR_COLORS`
   logic from seed). `participantCountLabel(participants, maxSlots)`.
4. `src/components/category-chip.tsx` → DB category names; icon map for the 8 names.
5. `src/components/party-card.tsx` → props `{ party: PartySummary; getMyStatus?; aiReason?;`
    tone?; chatHref?; chatDisabled?; nonInteractive? }`; avatars from `party.participants`;
    capacity label from `maxSlots`; budget handles `null`; `categoryName` `NULL` renders an
    "Other" chip.
6. `src/lib/ai/interpret.ts` → operate on `PartySummary`:
    category filter by `categoryName`, day/time-of-day via Bangkok helpers on `timeStart`,
    `budgetMax: 0` matches `NULL` cost only, `minSpots` from `maxSlots − approved count`,
    keyword match over `name/description/location/tags[].name`, ranking uses viewer `tags`
    overlap (viewer is `ProfileSummary`), `sortParties` by `timeStart` / participant count.
    Keep the simulated interpretation (OpenRouter is out of scope).
7. `src/components/filter-sheet.tsx` → accept `categories: string[]` prop (DB names);
    area presets stay the static 8 (On campus, Sam Yan, Siam, Ari, Silom, Sukhumvit,
    Chatuchak, Phra Nakhon).
8. Extract `inferArea` + `AREA_HINTS` from `create.tsx` into `src/lib/areas.ts` — real
    `PartySummary` has no area, so `PartyCard` (display line), `interpret` (area filter),
    and the create preview all derive it from `party.location` at render time.
9. `src/components/app-shell.tsx`: update the sidebar copy (no longer "all data is mock").
10. `src/components/map-pin-picker.tsx`: relocate the `MapPin` type here (or into
    `src/lib/filters.ts`) so it survives `data/types.ts` deletion.

## Phase 2 — pages (per-page wiring)

Common gSSP pattern for every authed page (one user-scoped client instance per request —
it both authenticates and queries; its cookie handler refreshes expired session tokens):

```ts
export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const supabase = createUserServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: "/signin", permanent: false } };
  // query with the same `supabase` instance; null result → { props: { error: true, ... } }
};
```

1. **`/` index.tsx** — gSSP: `getParties`, `getProfile(user.id)`, `getPartyCategories`.
    Client: discoverable = not past + not organiser + no own row; AI picks via
    `rankMatches(discoverable, {}, me)`; upcoming sort by `timeStart`; category counts
    from fetched list. Drop `hydrated` gates (SSR data renders immediately);
    `error` prop → `ErrorState`.
2. **`/search`** — gSSP: same triple as index. All filtering/ranking stays client-side.
    URL param init unchanged but `?category=` now carries the DB name (e.g. `Food`,
    URL-encoded); the home-page category links generate matching hrefs; validate the param
    against the fetched `categories` prop; `CYCLE_OPTIONS`/quick category buttons use the
    same prop. Update the AI info line copy (data is real now, interpretation still simulated).
3. **`/my`** — gSSP: `getPartiesByParticipant(user.id)` + `getPartiesByOrganiser(user.id)`;
    dedupe by id; status via `deriveMyStatus`; upcoming/past split client-side by
    `timeStart`. Requested parties show the pending badge (own pending rows are visible
    via RLS).
4. **`/parties/[id]`** — gSSP: `getParty(id)`; not-found → empty-state prop; also
    `getProfile(organiser_id)` is embedded via participants/creator link (fetch organiser
    profile separately for the organiser card). Mutations (browser client):
    - join: insert `parties_users` `{status: approval_required ? 'pending' : 'approved'}`,
      then set `parties.taken_slots` to the recomputed approved count (allowed by the
      `update_parties_taken_slots` policy + column grant, Locked decision 5); pre-check
      capacity client-side for UX, DB CHECK for races; on constraint error show
      "party is full".
    - cancel (own pending) / leave (own approved): DELETE own row, then recompute
      `taken_slots` the same way.
    - accept: UPDATE row → `'approved'` + recompute `taken_slots`; decline: DELETE row
      (organiser only — RLS enforces; organiser CAN update `parties`).
    - delete party: DELETE from `parties` (RLS organiser-only), then redirect `/`.
    Remove the 1.5 s auto-approve timer and its copy. Pending-requests section stays
    gated on `isCreator` (RLS already hides others' pending rows). Keep the
    created-party toast (sessionStorage flag) and dialogs.
5. **`/parties/[id]/chat`** — gSSP: `getParty(id)`; `canChat = organiser or own approved row`
    (server-side gate). Messages via a small local hook `useLocalMessages(partyId)`
    (localStorage keyed per party, ported from the store's `myMessages`; seeded mock
    conversations disappear — chats start empty, existing empty state covers it). Keep
    prototype copy.
6. **`/profile` (own)** — gSSP: `getProfile(user.id)` + `getTags`. Mutations (browser
    client): bio → UPDATE `user_profiles.biography`; add tag → normalize (trim +
    lowercase, `tags.name` is UNIQUE and case-sensitive), lookup id in fetched tags
    (INSERT into `tags` first if missing — RLS allows), then INSERT `users_tags`;
    remove tag → DELETE `users_tags` row. Keep 12-tag cap + ≤24 char validation client-side.
    Privacy toggles: no DB columns — local state with localStorage persistence, sidebar
    preview unchanged; retitle card from "(mock)" to a local-setting note. Update header
    copy (no longer "fixed mock user"). Add a **Sign out** control (sidebar/settings):
    `supabase.auth.signOut()` from the browser client, then `router.push("/signin")` —
    also required to switch accounts for the RLS validation below.
7. **`/profile/[id]`** — gSSP: `getProfile(id)`, `getPartiesByOrganiser(id)`,
    `getPartiesByParticipant(id)` (filter out self-organised for "Joining"), plus
    `getProfile(user.id)` for shared-interest highlights. Past split by `timeStart`.
    Note: RLS hides other users' *pending* rows, so another student's "Joining" list
    naturally shows only confirmed memberships — desired privacy behavior.
8. **`/create`** — gSSP: `getPartyCategories` + `getTags` (interest chips come from DB
    tags now, not `INTEREST_TAGS`). Submit (browser client): INSERT `parties`
    (name, description, category_id by name lookup, `time_start`/`time_end` via
    `toBangkokIso`, location, `location_coordinates` from the pin (verify PostgREST point
    format; drop pin silently if it fails), `estimated_cost` (free → NULL),
    `approval_required`, `max_slots` (limited → number ≥ 2, unlimited → NULL),
    `taken_slots` default 1), INSERT own `parties_users` approved row, INSERT
    `parties_tags` for selected tag ids. Keep preset meeting points + "Other" text field,
    `CREATED_PARTY_FLAG`, redirect, and toast. Remove the 6 s mock-joiner timer.
9. **`/signin`** — already real; add gSSP redirect to `/` when a valid session already
    exists (no double-login loop). **`/debug`** — keep; `/api/user` compiles once
    `get-user.ts` exists.

## Phase 3 — teardown

1. Delete `src/lib/data/seed.ts`, `src/lib/data/store.tsx`, `src/lib/api/interests.ts`.
2. `src/pages/_app.tsx`: remove `AppStoreProvider`.
3. Move `CREATED_PARTY_FLAG` to `src/lib/created-party.ts`.
4. Search for lingering imports of deleted modules; fix stragglers.

## Risks / notes

- **taken_slots integrity (app-side):** recompute-and-set after refetch converges toward
  the truth; a stale-low write can briefly admit one extra member before the next write,
  and the DB `CHECK (max_slots IS NULL OR taken_slots <= max_slots)` rejects counter
  overwrites past capacity ("party is full" in the UI). Deliberate trade-off of the
  column-scoped grant: any authenticated member can write `taken_slots` values that pass
  the CHECK (prototype-level trust, Google student-hd accounts only).
- **Hydration:** all `now`-derived values (past badges, counts) computed at request time
  may differ by milliseconds across the SSR/hydration boundary — accepted for a prototype;
  Bangkok-fixed formatting keeps strings identical.
- **`enrolment_year` semantics unverified:** mock profiles show "Year 3"; the DB column
  is a smallint whose actual values (academic year vs admission year) must be checked
  against real rows during implementation before picking a display format.
- **Server props privacy:** with the user-scoped client, props contain only RLS-visible
  rows — satisfies "do not serialize private database fields into page props".
- `parties_users` insert RLS enforces capacity + status rules; client errors surface as
  generic "could not join" messages (never raw DB errors).
- `debug.tsx` "User's Parties" section is unimplemented; optional follow-up.

## Validation

1. `pnpm lint`, `npx tsc --noEmit`, `pnpm build` clean.
2. Signed-in smoke test against the linked Supabase project: home/search/my render real
   rows; join (instant + approval), cancel, leave, accept, decline, delete on
   `/parties/[id]`; create → detail redirect → toast; profile bio/tag edits persist after
   reload; chat stays local but gated.
3. RLS spot-checks with a second Google account: other users' pending requests never
   appear in props/UI; organiser-only actions fail cleanly for others.
4. Capacity: fill a limited party → join blocked, `taken_slots` accurate after
   joins/leaves; verify the column grant works as intended (a joiner's client CAN update
   `taken_slots`, and attempts to update other party columns fail with a privilege error).

## Out of scope

- OpenRouter-backed AI interpretation (stays client-simulated).
- Realtime chat / messages table.
- Area/category edits to the DB, embeddings/vector search.
- `debug.tsx` parties wiring (optional follow-up).
