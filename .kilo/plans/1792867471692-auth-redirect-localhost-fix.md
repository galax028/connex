# Terminology cleanup: "plan" → "party"/"parties" in product copy

## Goal

Every user-facing string that calls a party a "plan" uses "party" (singular) or "parties" (plural)
instead. Code identifiers, routes, and database naming are unaffected.

## Decisions (confirmed with user)

- **Straight swap** for all noun usages: `a plan` → `a party`, `plans` → `parties`,
  `the plan` → `the party`, `Plan created` → `Party created`, etc.
- **Minimal rephrase** for the only two idioms where a literal swap breaks English:
  - `Nobody planning it yet?` → `No party for it yet?`
  - `What's the plan? …` → `What's the party about? …`
- Note: `AGENTS.md` currently prefers the label "Start a plan" — this user request overrides that
  preference, so the one-line guidance in `AGENTS.md` is updated too (see task 10).

## Scope

- **In:** user-facing copy in `src/` (headings, buttons, badges, toasts, dialogs, empty/error
  states, placeholders, SEO `<title>`/meta description) and the `AGENTS.md` terminology line.
- **Out:** code identifiers (`PartyCard`, `CREATED_PARTY_FLAG`, …), code comments
  (`party-card.tsx:31` "(e.g. plans you created)" stays), routes (`/create`, `/parties/[id]`),
  DB schema/seed (no "plan" found), README, `public/` (verified no matches).
- False-positive matches to leave untouched: `src/lib/ai/interpret.ts:559` ("ex**plan**ations"),
  `src/lib/areas.ts:13` ("es**plan**ade" keyword).

## Tasks — exact string replacements (match strings, not line numbers)

1. **`src/components/party-card.tsx`**
   - `Your plan` → `Your party` (creator badge, line 68)
2. **`src/components/state-views.tsx`**
   - `Try widening a filter — or start your own plan and let people find you.` →
     `…start your own party…` (line 79)
   - `Draft a plan` → `Draft a party` (line 99)
3. **`src/components/app-shell.tsx`**
   - `Start a plan` → `Start a party` (nav label, line 76)
4. **`src/pages/index.tsx`**
   - meta description: `…into a real plan.` → `…into a real party.` (line 116)
   - `Search activities or describe your plan…` → `Search activities or describe your party…` (line 134)
   - `Start a plan` → `Start a party` (2 occurrences: lines 197, 248)
   - `Nobody planning it yet?` → `No party for it yet?` (line 241)
   - `Post your own plan — badminton, study group, food run — …` → `Post your own party — …` (line 244)
5. **`src/pages/search.tsx`**
   - `Browse everything, or describe your plan in your own words.` → `…describe your party…` (line 471)
   - `Loosen a chip below, or draft your own plan instead — …` → `…draft your own party instead — …` (line 831)
   - `Draft a plan` → `Draft a party` (line 846)
6. **`src/pages/create.tsx`**
   - `Give the plan a title (at least 3 characters).` → `Give the party a title…` (line 153)
   - `Pick a time in the future — this plan should still happen.` → `…this party should still happen.` (line 161)
   - `Could not publish the plan. Try again.` → `Could not publish the party. Try again.` (line 312)
   - `The plan was published but joining it failed — try again from the plan page.` →
     `The party was published but joining it failed — try again from the party page.` (line 325)
   - `Your plan title` → `Your party title` (preview fallback, line 376)
   - `Start a plan · CONNEX` → `Start a party · CONNEX` (line 419)
   - `Start a plan` → `Start a party` (back-row label + h1, lines 426, 430)
   - `Plan title` → `Party title` (field label, line 449)
   - `What's the plan? Skill level, what to bring, สำหรับมือใหม่ก็มาได้…` →
     `What's the party about? Skill level, what to bring, สำหรับมือใหม่ก็มาได้…` (line 492)
   - `Help people find this plan through matching…` → `…find this party through matching…` (line 716)
7. **`src/pages/profile/index.tsx`**
   - `Join something or start your own plan.` → `…start your own party.` (line 458)
   - `Start a plan` → `Start a party` (line 462)
8. **`src/pages/profile/[id].tsx`**
   - `No shared interests yet — their plans might still be a fit.` → `…their parties…` (line 183)
   - `${profile.name} hasn't started a plan yet.` → `…started a party yet.` (line 193)
   - `${profile.name} hasn't joined any plans yet.` → `…joined any parties yet.` (line 198)
9. **`src/pages/parties/[id].tsx`** and **`src/pages/parties/[id]/chat.tsx`**
   - `This plan may have been removed…` → `This party may have been removed…` (details line 106,
     chat line 69)
   - `…new plans are posted all the time.` → `…new parties are posted all the time.` (line 124)
   - `Could not delete the plan. Try again.` → `Could not delete the party. Try again.` (line 326)
   - `Check out this plan on CONNEX: ${party.title}` → `Check out this party on CONNEX: …` (line 353)
   - `Delete this plan` → `Delete this party` (buttons, lines 536, 584)
   - `This permanently removes the plan for everyone…` → `…removes the party for everyone…` (line 586)
   - `Delete plan` → `Delete party` (line 592)
   - `Plan created` → `Party created` (toast, line 605)
   - `Your plan is live — people can find it in Discover and Search.` → `Your party is live…` (line 607)
   - `You're hosting this plan. …` → `You're hosting this party. …` (line 752)
10. **`AGENTS.md`** — in "UX and accessibility", update the preference line to
    `Prefer "Find a crew" and "Start a party" over vague labels.` so repo guidance matches the UI.

## Validation

1. `grep -rni "plan" src --include="*.tsx" --include="*.ts"` → remaining matches must be only the
   three intentional ones: `interpret.ts:559`, `areas.ts:13`, `party-card.tsx:31` (comment).
2. `npx tsc --noEmit`, `npx eslint` on touched files, `npx prettier --check` on touched files.
3. Manual pass: `/create` (title field, preview fallback, error strings, page title), `/` (meta,
   search link, CTA sidebar), `/search` empty states, `/profile`, `/parties/[id]` (delete dialog,
   toast, share text), app-shell nav. UI only — no tests per `AGENTS.md`.
4. All changes are copy-only; no behavior, routing, or DB changes. Thai strings (`สำหรับมือใหม่ก็มาได้…`)
   must be preserved exactly.
