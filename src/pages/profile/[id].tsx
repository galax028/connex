import * as React from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ParticipantAvatar } from "@/components/participant-avatar";
import { EmptyState, ErrorState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatEnrolmentYear, formatWhen, isPast } from "@/lib/format";
import { getPartiesByOrganiser } from "@/lib/supabase/queries/get-parties-by-organiser";
import { getPartiesByParticipant } from "@/lib/supabase/queries/get-parties-by-participant";
import { getProfile } from "@/lib/supabase/queries/get-profile";
import type { PartySummary, ProfileSummary } from "@/lib/supabase/queries/types";
import { createUserServerClient } from "@/lib/supabase/server";
import { cn } from "cn";
import { ArrowLeft, EyeOff, Handshake } from "lucide-react";

export interface StudentProfileProps {
  notFound: boolean;
  error?: boolean;
  userId?: string;
  profile?: ProfileSummary;
  me?: ProfileSummary | null;
  organised?: PartySummary[];
  joining?: PartySummary[];
}

export const getServerSideProps: GetServerSideProps<StudentProfileProps> = async ({
  req,
  res,
  params,
}) => {
  const supabase = createUserServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: "/signin", permanent: false } };

  const id = typeof params?.id === "string" ? params.id : undefined;
  if (!id) return { props: { notFound: true } };

  // The prototype keeps your own profile under /profile.
  if (id === user.id) {
    return { redirect: { destination: "/profile", permanent: false } };
  }

  const [profile, organised, participating, me] = await Promise.all([
    getProfile(supabase, id),
    getPartiesByOrganiser(supabase, id),
    getPartiesByParticipant(supabase, id),
    getProfile(supabase, user.id),
  ]);

  if (!profile) return { props: { notFound: true } };
  if (!organised || !participating) {
    return { props: { notFound: false, error: true, userId: user.id } };
  }

  // RLS hides other students' pending rows, so this list is confirmed
  // memberships only — the desired privacy behavior.
  const joining = participating.filter((party) => party.organiserId !== id);

  return {
    props: {
      notFound: false,
      userId: user.id,
      profile,
      me,
      organised,
      joining,
    },
  };
};

export default function StudentProfilePage({
  notFound,
  error = false,
  profile,
  me = null,
  organised = [],
  joining = [],
}: StudentProfileProps) {
  const router = useRouter();

  if (notFound || !profile) {
    return (
      <EmptyState
        title="Student not found"
        body="This profile doesn't exist."
        actions={
          <Button variant="outline" render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Back to discover
          </Button>
        }
      />
    );
  }

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  const myTagNames = new Set((me?.tags ?? []).map((tag) => tag.name.toLowerCase()));
  const shared = profile.tags.filter((tag) => myTagNames.has(tag.name.toLowerCase()));

  const past = [...organised, ...joining].filter((party) => isPast(party.timeStart));

  const yearLabel = formatEnrolmentYear(profile.enrolmentYear);

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
                    {profile.facultyName}
                    {yearLabel ? ` · ${yearLabel}` : ""}
                  </p>
                  {profile.biography ? (
                    <p className="text-sm text-foreground/90">{profile.biography}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <section aria-labelledby="interests-heading" className="flex flex-col gap-2">
              <h2 id="interests-heading" className="font-heading heading-3 font-semibold">
                Interests
              </h2>
              {profile.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.tags.map((tag) => {
                    const isShared = shared.includes(tag);
                    return (
                      <Badge key={tag.id} variant={isShared ? "default" : "secondary"}>
                        {tag.name}
                        {isShared ? " · shared" : ""}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No interests added yet.</p>
              )}
              {shared.length > 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Handshake aria-hidden="true" className="size-4 text-primary" />
                  You both like{" "}
                  {shared
                    .slice(0, 2)
                    .map((tag) => tag.name)
                    .join(" and ")}{" "}
                  — an easy icebreaker.
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
              title={`Hosting (${organised.length})`}
              parties={organised}
              emptyText={`${profile.name} hasn't started a plan yet.`}
            />
            <ProfilePartyList
              title={`Joining (${joining.length})`}
              parties={joining}
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
                      <PartyLinkRow
                        partyId={party.id}
                        title={party.title}
                        when={formatWhen(party.timeStart)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <EyeOff aria-hidden="true" className="size-3.5" />
              Contact details are not shared in this prototype.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function PartyLinkRow({ partyId, title, when }: { partyId: string; title: string; when: string }) {
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
    </div>
  );
}

function ProfilePartyList({
  title,
  parties,
  emptyText,
}: {
  title: string;
  parties: PartySummary[];
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
                when={formatWhen(party.timeStart)}
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
