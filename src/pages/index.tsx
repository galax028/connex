import * as React from "react";
import Head from "next/head";
import Link from "next/link";
import { AiBadge } from "@/components/ai-badge";
import { CategoryIcon } from "@/components/category-chip";
import { PartyCard } from "@/components/party-card";
import { EmptyState, LoadingList } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { rankMatches } from "@/lib/ai/interpret";
import { useApp } from "@/lib/data/store";
import { CATEGORIES, CATEGORY_LABELS, type Party } from "@/lib/data/types";
import { isPast } from "@/lib/format";
import { ChevronRight, Plus, Search } from "lucide-react";

export default function HomePage() {
  const { hydrated, parties, profiles, getProfile, myStatusFor, currentUserId } = useApp();
  const me = profiles.find((p) => p.id === currentUserId);

  const now = React.useMemo(() => new Date(), []);

  const discoverable = React.useMemo(
    () =>
      parties.filter(
        (party) =>
          !isPast(party.date, party.time, now) &&
          party.creatorId !== currentUserId &&
          !party.participants.some((p) => p.profileId === currentUserId),
      ),
    [parties, currentUserId, now],
  );

  const aiPicks = React.useMemo(() => {
    if (!hydrated) return [];
    return rankMatches(discoverable, {}, me, now)
      .filter((r) => {
        const accepted = r.party.participants.filter((p) => p.status === "accepted").length;
        return r.party.capacity === null || accepted < r.party.capacity;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [discoverable, me, hydrated, now]);

  const upcoming = React.useMemo(
    () =>
      discoverable
        .filter((p) => !p.participants.some((x) => x.profileId === currentUserId))
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime(),
        )
        .slice(0, 6),
    [discoverable, currentUserId],
  );

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
          {hydrated ? (
            aiPicks.length > 0 ? (
              <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
                {aiPicks.map(({ party, reasons }) => (
                  <li key={party.id} className="flex w-[17.5rem] shrink-0 snap-start">
                    <PartyCard
                      party={party}
                      getProfile={getProfile}
                      getMyStatus={myStatusFor}
                      aiReason={reasons[0]}
                      className="h-full"
                    />
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
            )
          ) : (
            <LoadingList />
          )}
        </section>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10">
          <section aria-labelledby="upcoming-heading" className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 id="upcoming-heading" className="font-heading heading-3 font-semibold">
                Happening soon
              </h2>
              <Button variant="ghost" size="sm" render={<Link href="/search" />}>
                Browse all <ChevronRight aria-hidden="true" />
              </Button>
            </div>
            {hydrated ? (
              upcoming.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {upcoming.map((party) => (
                    <li key={party.id}>
                      <PartyCard
                        party={party}
                        getProfile={getProfile}
                        getMyStatus={myStatusFor}
                        className="h-full"
                      />
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
              )
            ) : (
              <LoadingList />
            )}
          </section>

          <div className="flex flex-col gap-8 lg:sticky lg:top-6">
            <section aria-labelledby="categories-heading" className="flex flex-col gap-3">
              <h2 id="categories-heading" className="font-heading heading-3 font-semibold">
                Browse by category
              </h2>
              <ul className="grid grid-cols-2 gap-2.5">
                {CATEGORIES.map((category) => {
                  const count = parties.filter(
                    (p: Party) => p.category === category && !isPast(p.date, p.time, now),
                  ).length;
                  return (
                    <li key={category}>
                      <Link
                        href={`/search?category=${category}`}
                        className="flex items-center justify-between rounded-xl border bg-card px-3.5 py-3 text-sm transition-colors outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <CategoryIcon category={category} />
                          {CATEGORY_LABELS[category]}
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
