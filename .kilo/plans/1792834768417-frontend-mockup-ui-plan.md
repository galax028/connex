# CONNEX — Frontend Mockup UI Plan (Interactive Prototype)

## Goal

Implement a polished, mobile-first frontend prototype of CONNEX (campus activity / group-finding app for CU NEX Hackathon 2026) covering all core screens and journeys in the implementation brief. All data is client-side (mock); **no backend or database work** — Supabase stays untouched.

## Source of truth & decisions

- **Sources:** The user-supplied implementation brief + root `AGENTS.md`. `skills.md` does not exist in the repo (verified) — treat brief + AGENTS.md as authoritative.
- **Scope:** Interactive prototype (user-confirmed). Create/join/search/navigation must work using a client-side data layer.
- **Stack (existing, do not replace):** Next.js 16.4.2 Pages Router, React 19, Tailwind v4, shadcn "base-nova" style (`@base-ui/react` primitives), `lucide-react`, `cn`, CVA, tw-animate-css. Package manager: **pnpm only** (preinstall enforces it).
- **⚠️ Next.js version warning:** AGENTS.md states this Next.js version has breaking changes. Before writing any code, read `node_modules/next/dist/docs/02-pages/` (project structure, routing, data fetching) and heed deprecation notices.
- **Design system:** Extend the scaffold's existing tokens (`src/styles/globals.css`, oklch). Keep the pink primary (fits Chula brand) for both light and dark themes. Fonts already wired in `_app.tsx` (Inter/Lora/Ubuntu Mono).
- **Auth:** No real auth. A fixed mock current user ("You") lives in the data layer.
- **AI Search:** Fully simulated client-side — rule-based/heuristic interpretation of natural-language queries producing editable interpretation chips, with a clearly-labeled "prototype" processing state. Do not present it as live AI. Keep behind a service interface (`src/lib/ai/`) so a real OpenRouter call can replace it later without UI changes.
- **Group chat:** Mock conversation view per party; sending a message appends to local state only.
- **Persistence:** `localStorage` under a namespaced key for created/joined parties; seed data is in-memory. Clearly separated from any production service code.

## File layout (new)

```
src/
  lib/
    data/types.ts          # Party, Profile, Category enums, Participation status
    data/seed.ts           # Realistic sample activities (incl. Thai+English), profiles
    data/store.tsx         # React context provider (in _app): parties, joins, current user; localStorage sync
    ai/interpret.ts        # Simulated NL query → structured filters (bounded schema, validated)
    format.ts              # Date/time, ฿ budget formatting helpers
  components/
    app-shell.tsx          # Mobile bottom nav (5 items) + desktop side rail (≥lg) + centered max-width content
    party-card.tsx         # Scannable card: category, title, date/time, area, ฿/person, spots left
    ai-badge.tsx           # Distinguishes AI recommendations from regular results
    category-chip.tsx, filter-sheet.tsx, participant-avatar.tsx, state-views.tsx (loading/empty/error/success)
    ui/                    # Added via shadcn CLI: card, input, textarea, label, select, badge, sheet, dialog, tabs, avatar, skeleton, switch
  pages/
    index.tsx              # Home / Discover
    search.tsx             # Search (mode toggle: All | AI)
    create.tsx             # Create Party form
    my.tsx                 # My Activities (upcoming joined / created / past tabs)
    profile/index.tsx      # Current user profile
    profile/[id].tsx       # Other student profiles
    parties/[id].tsx       # Party details
    parties/[id]/chat.tsx  # Group chat (mock)
```

## Screens & behaviors

1. **App shell** — Bottom nav: Home, Search, Create (prominent center action), My Activities, Profile. Desktop ≥lg: rail + max-width content; mobile experience uncompromised.
2. **Home/Discover** — Upcoming activities, AI-recommended section (badged), category rows (sports, food, gaming, studying), search entry, create entry.
3. **Search** — Effortless segmented mode toggle. Mode 1: all activities/parties; filters (type, date/time, budget) in a bottom sheet; sort by relevance/soonest/popularity; results update live. Mode 2: NL query input, suggested prompts, simulated interpretation → editable chips, match explanations derived from retrieved fields only, personalized recommendations. State preserved when switching modes/refining.
4. **Party details** — Title, description, category, date/time, location, est. budget, creator card (links to profile), participant avatars (link to profiles), spots remaining, prominent Join Party action. States: available / requested / joined / full / past (clearly distinct, not color-only).
5. **Join flow** — Join updates My Activities immediately; chat entry appears for joined parties. Duplicate submissions prevented (pending state).
6. **Create Party** — All brief fields; client-side validation with inline errors preserving input on failure; publish → success confirmation state; new party appears in discovery and My Activities.
7. **My Activities** — Tabs: upcoming joined / created / past; each row links to details + chat.
8. **Profiles** — Mock student info, interests, joined/created parties; shared-interests hint; mock privacy toggles for personal fields.
9. **States** — Loading skeletons, empty states (with suggested filter changes / "draft a plan" CTA), error, success; all reachable in the prototype.

## Core journey to verify

Discover → Search/filter → Party details → View participants → Join → visible in My Activities. Also: Create → publish → appears in discovery → joinable.

## Task order

1. Read Next.js Pages Router docs (per AGENTS.md warning); add shadcn ui components.
2. Data layer: types, seed data (Thai+English), store provider + localStorage.
3. App shell + navigation (mobile-first, then desktop rail).
4. Home/Discover, Party card, party details, join flow.
5. Search: Mode 1 filters/sort; Mode 2 simulated AI + chips + explanations.
6. Create Party form + validation + success; My Activities tabs.
7. Profiles (+ [id]) and mock chat.
8. Personalized recommendations, AI badge, all states (loading/empty/error/success).
9. Validation & polish.

## Validation

- `pnpm lint` and `pnpm build` pass.
- Walk both core journeys manually at 375px and desktop widths.
- Keyboard-navigate the nav, search toggle, filters, forms; visible focus states; contrast check for pink-on-white and dark theme; status never conveyed by color alone.
- Confirm no imports from `src/pages/api/` or Supabase client anywhere in new code; no secrets in client modules.

## Out of scope

- Any Supabase/schema/RLS/API work; real AI integration; real auth; tests (repo says none for now).
