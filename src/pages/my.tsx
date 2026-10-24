import Link from "next/link";
import Head from "next/head";
import * as React from "react";
import { Plus } from "lucide-react";

import { PartyCard } from "@/components/party-card";
import { EmptyState, LoadingList } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/data/store";
import type { Party } from "@/lib/data/types";
import { isPast } from "@/lib/format";

type TabKey = "upcoming" | "past";

export default function MyActivitiesPage() {
  const { hydrated, parties, getProfile, myStatusFor, currentUserId } = useApp();
  const [tab, setTab] = React.useState<TabKey>("upcoming");
  const now = React.useMemo(() => new Date(), []);

  const bySoonest = (a: Party, b: Party) =>
    new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();

  const mine = React.useCallback(
    (party: Party) => myStatusFor(party) !== "none",
    [myStatusFor]
  );

  const lists: Record<TabKey, Party[]> = React.useMemo(
    () => ({
      upcoming: parties
        .filter((party) => !isPast(party.date, party.time, now) && mine(party))
        .sort(bySoonest),
      past: parties
        .filter((party) => isPast(party.date, party.time, now) && mine(party))
        .sort((a, b) => bySoonest(b, a)),
    }),
    [parties, mine, now]
  );

  const renderCards = (cards: Party[]) => (
    <ul className="grid gap-3 sm:grid-cols-2">
      {cards.map((party) => {
        const status = myStatusFor(party);
        const created = party.creatorId === currentUserId;
        return (
          <li key={party.id}>
            <PartyCard
              party={party}
              getProfile={getProfile}
              getMyStatus={myStatusFor}
              tone={created ? "primary" : "default"}
              chatHref={`/parties/${party.id}/chat`}
              chatDisabled={status === "requested"}
              className="h-full"
            />
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <Head>
        <title>My Activities · CONNEX</title>
      </Head>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading heading-1 font-semibold tracking-tight">My Activities</h1>
          <p className="text-sm text-muted-foreground">
            Everything you joined or started, in one place.
          </p>
        </header>

        <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
          <TabsList className="w-full">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          {(["upcoming", "past"] as TabKey[]).map((key) => (
            <TabsContent key={key} value={key}>
              {!hydrated ? (
                <LoadingList />
              ) : lists[key].length > 0 ? (
                <div className="pt-3">{renderCards(lists[key])}</div>
              ) : (
                <div className="pt-3">
                  <EmptyState
                    title={key === "upcoming" ? "No upcoming activities" : "No past activities yet"}
                    body={
                      key === "upcoming"
                        ? "Find something fun and join — it shows up here right away."
                        : "Activities you joined or hosted will be kept here after they happen."
                    }
                    actions={
                      <Button render={<Link href="/" />}>
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        Discover activities
                      </Button>
                    }
                  />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
