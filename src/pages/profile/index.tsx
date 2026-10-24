import Link from "next/link";
import Head from "next/head";
import * as React from "react";
import { Eye, EyeOff, MessageCircle, Plus, Settings2 } from "lucide-react";

import { ParticipantAvatar } from "@/components/participant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState, LoadingList } from "@/components/state-views";
import { useApp } from "@/lib/data/store";
import { isPast, plural } from "@/lib/format";

export default function MyProfilePage() {
  const {
    hydrated,
    profiles,
    parties,
    myStatusFor,
    currentUserId,
    privacy,
    setPrivacy,
  } = useApp();
  const me = profiles.find((p) => p.id === currentUserId);
  const now = React.useMemo(() => new Date(), []);

  if (!hydrated || !me) {
    return <LoadingList label="Loading profile…" />;
  }

  const joined = parties.filter(
    (party) =>
      party.creatorId !== currentUserId &&
      myStatusFor(party) !== "none" &&
      !isPast(party.date, party.time, now)
  );
  const created = parties.filter((party) => party.creatorId === currentUserId);

  const privacyRows: Array<{ key: keyof typeof privacy; label: string }> = [
    { key: "showFaculty", label: "Show my faculty & year" },
    { key: "showBio", label: "Show my bio" },
  ];

  return (
    <>
      <Head>
        <title>Your profile · CONNEX</title>
      </Head>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="text-sm text-muted-foreground">
            Prototype account — fixed mock user, no real login.
          </p>
        </header>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-5">
            <Card size="sm">
              <CardContent className="flex items-start gap-4 pt-1">
                <ParticipantAvatar profile={me} size="lg" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-heading text-lg font-semibold">{me.name} (you)</p>
                  <p className="text-sm text-muted-foreground">
                    {me.faculty} · {me.year}
                  </p>
                  <p className="text-sm text-foreground/90">{me.bio}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {me.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-2">
              <StatTile label="Joined" value={plural(joined.length, "party", "parties")} href="/my" />
              <StatTile label="Created" value={plural(created.length, "party", "parties")} href="/my" />
            </div>

            <section aria-labelledby="my-parties-heading" className="flex flex-col gap-2">
              <h2 id="my-parties-heading" className="font-heading text-lg font-semibold">
                Your parties
              </h2>
              {joined.length + created.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {[...created, ...joined].map((party) => (
                    <li key={party.id}>
                      <Link
                        href={`/parties/${party.id}`}
                        className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 outline-none transition-colors hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium">{party.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {party.creatorId === currentUserId ? "Created by you" : "Joined"} ·{" "}
                            {isPast(party.date, party.time, now) ? "Past" : "Upcoming"}
                          </span>
                        </div>
                        {party.creatorId === currentUserId || myStatusFor(party) === "joined" ? (
                          <MessageCircle
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No parties yet"
                  body="Join something or start your own plan."
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

          <div className="self-start lg:sticky lg:top-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 aria-hidden="true" className="size-4 text-muted-foreground" />
                  Privacy (mock)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                <p className="text-sm text-muted-foreground">
                  Controls what other students see. Preview below updates live.
                </p>
                {privacyRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-4">
                    <Label htmlFor={`privacy-${row.key}`} className="text-sm font-normal">
                      {row.label}
                    </Label>
                    <Switch
                      id={`privacy-${row.key}`}
                      checked={privacy[row.key]}
                      onCheckedChange={(checked) => setPrivacy(row.key, checked === true)}
                    />
                  </div>
                ))}
                <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {privacy.showFaculty ? (
                      <Eye aria-hidden="true" className="size-3.5" />
                    ) : (
                      <EyeOff aria-hidden="true" className="size-3.5" />
                    )}
                    How others see you
                  </p>
                  <p className="text-sm font-medium">{me.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {privacy.showFaculty ? `${me.faculty} · ${me.year}` : "Faculty hidden"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {privacy.showBio ? me.bio : "Bio hidden"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function StatTile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-0.5 rounded-xl border bg-card px-4 py-3 outline-none transition-colors hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-heading text-lg font-semibold">{value}</span>
    </Link>
  );
}
