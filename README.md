# CONNEX

CONNEX is a campus activity and group-finding app for Chulalongkorn University students, built for the CU NEX Hackathon 2026. It turns "I would go if I had someone to go with" into a real plan: find activities or student groups ("parties"), start your own, request to join, and chat once you are in. Search works with plain keywords as well as natural-language queries that are interpreted into structured filters server-side.

## Tech stack

- [Next.js](https://nextjs.org) (Pages Router) with TypeScript and React
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres database, Google OAuth sign-in,
  and Row Level Security
- [pnpm](https://pnpm.io) as the package manager (enforced on install)
- [Vercel](https://vercel.com) for deployment

## Setup

### Prerequisites

- Node.js 20+
- pnpm 12+
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
  (for the database)
- A Google OAuth client ID and secret (for sign-in)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the template and fill in the values:

```bash
cp .env.example .env
```

| Variable                                      | Purpose                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                    | Supabase project URL (browser and server)                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`        | Supabase publishable key                                                          |
| `SUPABASE_SECRET_KEY`                         | Server-only Supabase key for privileged server operations                         |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` | Google OAuth client secret, read by the Supabase CLI when running the local stack |
| `DATABASE_URL`                                | Direct Postgres connection string (not used by the app itself)                    |

`.env` is gitignored — never commit it. Get the Supabase values from your
project's dashboard under Project Settings → API.

### 3. Run

```bash
pnpm dev # development server at http://localhost:3000
```

Other scripts:

| Command             | Description                |
| ------------------- | -------------------------- |
| `pnpm build`        | Production build           |
| `pnpm start`        | Serve the production build |
| `pnpm lint`         | ESLint                     |
| `pnpm format`       | Format with Prettier       |
| `pnpm format:check` | Check formatting           |

## Deploying

### This Repository

1. Import the GitHub repository into
   [Vercel](https://vercel.com/new) — the Next.js preset works out of the box.
2. Add the environment variables from the table above in the Vercel project
   settings.
3. Apply migrations to the production database with `supabase db push` while
   linked to the production project.
4. Point Supabase Auth at the deployed domain: set the Site URL, add the
   production URL to the allowed redirect list, and register the matching
   `<project-ref>.supabase.co/auth/v1/callback` redirect in Google Cloud
   Console if you have not already.

### Supabase

Schema changes are managed through the committed migrations in
`supabase/migrations`.

For a local database:

```bash
supabase start # local stack, auth API at http://127.0.0.1:54321
supabase db reset # applies all migrations
```

To work against a remote Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push # applies pending migrations
```

### Google Sign In

- In the Google Cloud Console, add an authorized redirect URI pointing at the
  Supabase auth callback: `https://<project-ref>.supabase.co/auth/v1/callback`
  (locally this is `http://127.0.0.1:54321/auth/v1/callback`, already set in
  `supabase/config.toml`).
- In the Supabase dashboard, enable the Google provider under Authentication →
  Sign In / Providers with your client ID and secret, and add your app URL to
  the allowed redirect URLs.
