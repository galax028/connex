import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import * as React from "react";
import { Plus } from "lucide-react";

import { PartyCard } from "@/components/party-card";
import { EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createUserServerClient } from "@/lib/supabase/server";
import { getPartiesByOrganiser } from "@/lib/supabase/queries/get-parties-by-organiser";
import { getPartiesByParticipant } from "@/lib/supabase/queries/get-parties-by-participant";
import type { PartySummary } from "@/lib/supabase/queries/types";
import { isPast } from "@/lib/format";
import { deriveMyStatus } from "@/lib/participants";

export interface MyActivitiesProps {
  error: boolean;
  userId?: string;
  parties?: PartySummary[];
}

export const getServerSideProps: GetServerSideProps<MyActivitiesProps> = async ({
  req,
  res,
}) => {
  const supabase = createUserServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: "/signin", permanent: false } };

  const [participating, organised] = await Promise.all([
    getPartiesByParticipant(supabase, user.id),
    getPartiesByOrganiser(supabase, user.id),
  ]);

  if (!participating || !organised) {
    return { props: { error: true, userId: user.id } };
  }

  // The organiser is also a participant (own approved row) — dedupe by id.
  const byId = new Map<string, PartySummary>();
  for (const party of [...organised, ...participating]) byId.set(party.id, party);

  return {
    props: { error: false, userId: user.id, parties: [...byId.values()] },
  };
};

type TabKey = "upcoming" | "past";

export default function MyActivitiesPage({
  error,
  userId = "",
  parties = [],
}: MyActivitiesProps) {
  const [tab, setTab] = React.useState<TabKey>("upcoming");
  const now = React.useMemo(() => new Date().getTime(), []);

  const bySoonest = (a: PartySummary, b: PartySummary) =>
    new Date(a.timeStart).getTime() - new Date(b.timeStart).getTime();

  const lists: Record<TabKey, PartySummary[]> = React.useMemo(
    () => ({
      upcoming: parties
        .filter((party) => !isPast(party.timeStart, now))
        .sort(bySoonest),
      past: parties
        .filter((party) => isPast(party.timeStart, now))
        .sort((a, b) => bySoonest(b, a)),
    }),
    [parties, now]
  );

  const renderCards = (cards: PartySummary[]) => (
    <ul className="grid gap-3 sm:grid-cols-2">
      {cards.map((party) => {
        const status = deriveMyStatus(party, userId);
        const created = party.organiserId === userId;
        return (
          <li key={party.id}>
            <PartyCard
              party={party}
              getMyStatus={() => status}
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

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

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
              {lists[key].length > 0 ? (
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
