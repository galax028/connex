import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { ArrowLeft, EyeOff, Handshake, MessageCircle } from "lucide-react";

import { ParticipantAvatar } from "@/components/participant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingList } from "@/components/state-views";
import { useApp } from "@/lib/data/store";
import { formatWhen, isPast } from "@/lib/format";
import { cn } from "cn";

function asId(param: string | string[] | undefined): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

export default function StudentProfilePage() {
  const router = useRouter();
  const id = asId(router.query.id);
  const { hydrated, profiles, parties, getProfile, currentUserId } = useApp();

  const profile = hydrated && id ? getProfile(id) : undefined;
  const me = profiles.find((p) => p.id === currentUserId);

  if (!hydrated) return <LoadingList label="Loading profile…" />;

  if (id === currentUserId) {
    return (
      <EmptyState
        title="That’s you"
        body="This link points at your own profile — the prototype keeps it under /profile."
        actions={
          <Button render={<Link href="/profile" />}>Open your profile</Button>
        }
      />
    );
  }

  if (!profile || !id) {
    return (
      <EmptyState
        title={router.isReady ? "Student not found" : "Loading…"}
        body={router.isReady ? "This profile doesn't exist in the prototype data." : undefined}
        actions={
          <Button variant="outline" render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Back to discover
          </Button>
        }
      />
    );
  }

  const shared = profile.interests.filter((interest) =>
    me?.interests.some((mine) => mine.toLowerCase() === interest.toLowerCase())
  );
  const created = parties.filter((party) => party.creatorId === profile.id);
  const participating = parties.filter(
    (party) =>
      party.creatorId !== profile.id &&
      party.participants.some(
        (p) => p.profileId === profile.id && p.status === "accepted"
      )
  );
  const past = [...created, ...participating].filter((party) =>
    isPast(party.date, party.time)
  );

  return (
    <>
      <Head>
        <title>{profile.name} · CONNEX</title>
      </Head>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Go back" onClick={() => router.back()}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="text-sm text-muted-foreground">Student profile</span>
        </div>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="flex flex-col gap-5 self-start lg:sticky lg:top-6">
            <Card size="sm">
              <CardContent className="flex items-start gap-4 pt-1">
                <ParticipantAvatar profile={profile} size="lg" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-heading heading-3 font-semibold">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.faculty} · {profile.year}
                  </p>
                  <p className="text-sm text-foreground/90">{profile.bio}</p>
                </div>
              </CardContent>
            </Card>

            <section aria-labelledby="interests-heading" className="flex flex-col gap-2">
              <h2 id="interests-heading" className="font-heading heading-3 font-semibold">
                Interests
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => {
                  const isShared = shared.includes(interest);
                  return (
                    <Badge key={interest} variant={isShared ? "default" : "secondary"}>
                      {interest}
                      {isShared ? " · shared" : ""}
                    </Badge>
                  );
                })}
              </div>
              {shared.length > 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Handshake aria-hidden="true" className="size-4 text-primary" />
                  You both like {shared.slice(0, 2).join(" and ")} — an easy icebreaker.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shared interests yet — their plans might still be a fit.
                </p>
              )}
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <ProfilePartyList
              title={`Hosting (${created.length})`}
              parties={created}
              emptyText={`${profile.name} hasn't started a plan yet.`}
            />
            <ProfilePartyList
              title={`Joining (${participating.length})`}
              parties={participating}
              emptyText={`${profile.name} hasn't joined any plans yet.`}
            />

            {past.length > 0 ? (
              <section aria-labelledby="past-heading" className="flex flex-col gap-2">
                <h2 id="past-heading" className="font-heading heading-3 font-semibold">
                  Past activities
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {past.map((party) => (
                    <li key={party.id} className="opacity-75">
                      <PartyLinkRow partyId={party.id} title={party.title} when={formatWhen(party.date, party.time)} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <EyeOff aria-hidden="true" className="size-3.5" />
              Contact details are hidden by mock privacy settings in this prototype.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function PartyLinkRow({
  partyId,
  title,
  when,
  chatAvailable,
}: {
  partyId: string;
  title: string;
  when: string;
  chatAvailable?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/parties/${partyId}`}
          className="truncate text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {title}
        </Link>
        <span className="text-xs text-muted-foreground">{when}</span>
      </div>
      {chatAvailable ? (
        <Link
          href={`/parties/${partyId}/chat`}
          aria-label={`Open chat for ${title}`}
          className="rounded-lg p-1.5 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <MessageCircle aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function ProfilePartyList({
  title,
  parties,
  emptyText,
}: {
  title: string;
  parties: import("@/lib/data/types").Party[];
  emptyText: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="font-heading heading-3 font-semibold">{title}</h2>
      {parties.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {parties.map((party) => (
            <li key={party.id}>
              <PartyLinkRow
                partyId={party.id}
                title={party.title}
                when={formatWhen(party.date, party.time)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("text-sm text-muted-foreground")}>{emptyText}</p>
      )}
    </section>
  );
}
