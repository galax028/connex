import * as React from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { AiBadge } from "@/components/ai-badge";
import { CategoryIcon } from "@/components/category-chip";
import { PartyCard } from "@/components/party-card";
import { EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { rankMatches } from "@/lib/ai/interpret";
import { consumeDataMutated } from "@/lib/data-version";
import { isPast } from "@/lib/format";
import { approvedParticipants } from "@/lib/participants";
import { getParties } from "@/lib/supabase/queries/get-parties";
import { getPartyCategories } from "@/lib/supabase/queries/get-party-categories";
import { getProfile } from "@/lib/supabase/queries/get-profile";
import type { PartySummary, ProfileSummary } from "@/lib/supabase/queries/types";
import { createUserServerClient } from "@/lib/supabase/server";
import { ChevronRight, Plus, Search } from "lucide-react";

export interface HomeProps {
  error: boolean;
  userId?: string;
  parties?: PartySummary[];
  me?: ProfileSummary | null;
  categories?: string[];
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({ req, res }) => {
  const supabase = createUserServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: "/signin", permanent: false } };

  const [parties, me, categories] = await Promise.all([
    getParties(supabase),
    getProfile(supabase, user.id),
    getPartyCategories(supabase),
  ]);

  if (!parties) {
    return { props: { error: true, userId: user.id } };
  }

  return {
    props: {
      error: false,
      userId: user.id,
      parties,
      me,
      categories: (categories ?? []).map((category) => category.name),
    },
  };
};

export default function HomePage({
  error,
  userId = "",
  parties = [],
  me = null,
  categories = [],
}: HomeProps) {
  const router = useRouter();

  // Back/forward navigation restores cached props — refetch once when another
  // page mutated data recently so counts and picks stay truthful.
  React.useEffect(() => {
    if (consumeDataMutated()) void router.replace(router.asPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: consume the staleness flag once per mount
  }, []);

  const now = React.useMemo(() => new Date().getTime(), []);

  const discoverable = React.useMemo(
    () =>
      parties.filter(
        (party) =>
          !isPast(party.timeStart, now) &&
          party.organiserId !== userId &&
          !party.participants.some((p) => p.id === userId),
      ),
    [parties, userId, now],
  );

  const aiPicks = React.useMemo(
    () =>
      rankMatches(discoverable, {}, me ?? undefined, now)
        .filter((r) => {
          const accepted = approvedParticipants(r.party).length;
          return r.party.maxSlots === null || accepted < r.party.maxSlots;
        })
        .slice(0, 5),
    [discoverable, me, now],
  );

  const upcoming = React.useMemo(
    () =>
      [...discoverable]
        .sort((a, b) => new Date(a.timeStart).getTime() - new Date(b.timeStart).getTime())
        .slice(0, 6),
    [discoverable],
  );

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <Head>
        <title>CONNEX · Find your crew</title>
        <meta
          name="description"
          content="Turn “I would go if I had someone to go with” into a real plan."
        />
      </Head>

      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Chulalongkorn University</p>
          <h1 className="font-heading heading-1 font-semibold tracking-tight">Find your crew</h1>
          <p className="text-sm text-muted-foreground">
            “I would go if I had someone to go with” — never again.
          </p>
        </header>

        <Link
          href="/search"
          className="flex h-11 items-center gap-2.5 rounded-xl border border-input bg-background px-3.5 text-sm text-muted-foreground transition-colors outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:max-w-md"
        >
          <Search aria-hidden="true" className="size-4" />
          Search activities or describe your plan…
        </Link>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-8">
            <section aria-labelledby="ai-picks-heading" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="ai-picks-heading"
                  className="flex items-center gap-2 font-heading heading-3 font-semibold"
                >
                  Picked for you
                  <AiBadge />
                </h2>
                <Button variant="ghost" size="sm" render={<Link href="/search?mode=ai" />}>
                  Ask AI <ChevronRight aria-hidden="true" />
                </Button>
              </div>
              {aiPicks.length > 0 ? (
                <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
                  {aiPicks.map(({ party, reasons }) => (
                    <li key={party.id} className="flex w-[17.5rem] shrink-0 snap-start">
                      <PartyCard party={party} aiReason={reasons[0]} className="h-full w-full" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No recommendations yet"
                  body="Add interests to your profile so suggestions can be based on what you like."
                  actions={
                    <Button variant="outline" render={<Link href="/profile" />}>
                      Edit interests
                    </Button>
                  }
                />
              )}
            </section>

            <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 id="upcoming-heading" className="font-heading heading-3 font-semibold">
                  Happening soon
                </h2>
                <Button variant="ghost" size="sm" render={<Link href="/search" />}>
                  Browse all <ChevronRight aria-hidden="true" />
                </Button>
              </div>
              {upcoming.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {upcoming.map((party) => (
                    <li key={party.id}>
                      <PartyCard party={party} className="h-full" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="Nothing upcoming yet"
                  body="Be the one who gets the group together."
                  actions={
                    <Button render={<Link href="/create" />}>
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      Start a plan
                    </Button>
                  }
                />
              )}
            </section>
          </div>

          <div className="flex flex-col gap-8 lg:sticky lg:top-6">
            <section aria-labelledby="categories-heading" className="flex flex-col gap-3">
              <h2 id="categories-heading" className="font-heading heading-3 font-semibold">
                Browse by category
              </h2>
              <ul className="grid grid-cols-2 gap-2.5">
                {categories.map((category) => {
                  const count = parties.filter(
                    (p) => p.categoryName === category && !isPast(p.timeStart, now),
                  ).length;
                  return (
                    <li key={category}>
                      <Link
                        href={`/search?category=${encodeURIComponent(category)}`}
                        className="flex items-center justify-between rounded-xl border bg-card px-3.5 py-3 text-sm transition-colors outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <CategoryIcon category={category} />
                          {category}
                        </span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section
              aria-labelledby="create-cta-heading"
              className="flex flex-col gap-2 rounded-xl bg-primary/10 px-5 py-5 ring-1 ring-primary/20"
            >
              <h2
                id="create-cta-heading"
                className="font-heading heading-3 font-semibold text-primary"
              >
                Nobody planning it yet?
              </h2>
              <p className="text-sm text-foreground/80">
                Post your own plan — badminton, study group, food run — and let people find you.
              </p>
              <Button className="mt-1 self-start" render={<Link href="/create" />}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Start a plan
              </Button>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
