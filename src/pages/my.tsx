import Link from "next/link";
import Head from "next/head";
import * as React from "react";
import { MessageCircle, Plus } from "lucide-react";

import { PartyCard } from "@/components/party-card";
import { EmptyState, LoadingList } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/data/store";
import type { Party } from "@/lib/data/types";
import { isPast } from "@/lib/format";

type TabKey = "upcoming" | "created" | "past";

export default function MyActivitiesPage() {
  const { hydrated, parties, getProfile, myStatusFor, currentUserId } = useApp();
  const [tab, setTab] = React.useState<TabKey>("upcoming");
  const now = React.useMemo(() => new Date(), []);

  const mine = React.useCallback(
    (party: Party) => myStatusFor(party) !== "none",
    [myStatusFor]
  );

  const upcomingJoined = React.useCallback(
    () =>
      parties
        .filter(
          (party) =>
            !isPast(party.date, party.time, now) &&
            party.creatorId !== currentUserId &&
            mine(party)
        )
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
        ),
    [parties, currentUserId, mine, now]
  );

  const created = React.useCallback(
    () =>
      parties
        .filter((party) => party.creatorId === currentUserId)
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
        ),
    [parties, currentUserId]
  );

  const past = React.useCallback(
    () =>
      parties
        .filter((party) => isPast(party.date, party.time, now) && mine(party))
        .sort(
          (a, b) =>
            new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()
        ),
    [parties, mine, now]
  );

  const lists: Record<TabKey, Party[]> = {
    upcoming: upcomingJoined(),
    created: created(),
    past: past(),
  };

  return (
    <>
      <Head>
        <title>My Activities · CONNEX</title>
      </Head>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">My Activities</h1>
          <p className="text-sm text-muted-foreground">
            Everything you joined or started, in one place.
          </p>
        </header>

        <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
          <TabsList className="w-full">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="created">Created</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          {(["upcoming", "created", "past"] as TabKey[]).map((key) => (
            <TabsContent key={key} value={key}>
              {!hydrated ? (
                <LoadingList />
              ) : lists[key].length > 0 ? (
                <ul className="grid gap-3 pt-3 sm:grid-cols-2">
                  {lists[key].map((party) => {
                    const status = myStatusFor(party);
                    return (
                      <li key={party.id} className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <PartyCard
                            party={party}
                            getProfile={getProfile}
                            getMyStatus={myStatusFor}
                            className="h-full"
                          />
                        </div>
                        {status === "requested" ? (
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Chat opens after approval for ${party.title}`}
                            className="mt-1 shrink-0"
                            disabled
                          >
                            <MessageCircle aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            render={<Link href={`/parties/${party.id}/chat`} />}
                            aria-label={`Open chat for ${party.title}`}
                            className="mt-1 shrink-0"
                          >
                            <MessageCircle aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="pt-3">
                  <EmptyState
                    title={
                      key === "upcoming"
                        ? "No upcoming activities"
                        : key === "created"
                          ? "You haven't started a plan yet"
                          : "No past activities yet"
                    }
                    body={
                      key === "upcoming"
                        ? "Find something fun and request to join — it shows up here right away."
                        : key === "created"
                          ? "Post what you want to do and let people find you."
                          : "Activities you joined or hosted will be kept here after they happen."
                    }
                    actions={
                      <Button render={<Link href={key === "created" ? "/create" : "/"} />}>
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        {key === "created" ? "Start a plan" : "Discover activities"}
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
