import Link from "next/link";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  Hourglass,
  MapPin,
  MessageCircle,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";

import { CategoryChip } from "@/components/category-chip";
import { ParticipantAvatar } from "@/components/participant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, SuccessBanner } from "@/components/state-views";
import { CREATED_PARTY_FLAG, useApp } from "@/lib/data/store";
import type { Party } from "@/lib/data/types";
import { formatBudgetPerPerson, formatTime, formatWhen, isPast } from "@/lib/format";
import { cn } from "cn";

const MapPinPreview = dynamic(
  () => import("@/components/map-pin-picker").then((m) => m.MapPinPreview),
  {
    ssr: false,
    loading: () => <div className="h-40 w-full rounded-xl border bg-muted" />,
  }
);

function asId(param: string | string[] | undefined): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

export default function PartyDetailsPage() {
  const router = useRouter();
  const partyId = asId(router.query.id);
  const { hydrated, getParty } = useApp();
  const party = hydrated && partyId ? getParty(partyId) : undefined;

  if (!hydrated) {
    return <DetailsSkeleton />;
  }

  if (!party || !partyId) {
    return (
      <EmptyState
        title={router.isReady ? "Party not found" : "Loading…"}
        body={
          router.isReady
            ? "This plan may have been removed, or the link is from another browser profile."
            : undefined
        }
        actions={
          <Button variant="outline" render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Back to discover
          </Button>
        }
      />
    );
  }

  // Keyed by party id so local UI state resets when navigating between parties.
  return <PartyDetailsView key={party.id} party={party} />;
}

const JOIN_COPY = {
  full: {
    title: "Party is full",
    body: "All spots are taken. Browse other activities — new plans are posted all the time.",
  },
  past: {
    title: "This activity already happened",
    body: "It stays in the history of everyone who joined.",
  },
} as const;

function PartyDetailsView({ party }: { party: Party }) {
  const router = useRouter();
  const {
    getProfile,
    myStatusFor,
    acceptedParticipants,
    pendingRequests,
    requestJoin,
    cancelRequest,
    leaveParty,
    acceptRequest,
    declineRequest,
    deleteParty,
    currentUserId,
  } = useApp();

  const status = myStatusFor(party);
  const past = isPast(party.date, party.time);
  const accepted = acceptedParticipants(party);
  const full = party.capacity !== null && accepted.length >= party.capacity;
  const isCreator = party.creatorId === currentUserId;

  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [justRequested, setJustRequested] = React.useState(false);
  const [confirmLeave, setConfirmLeave] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [createdToast, setCreatedToast] = React.useState(false);

  // One-shot toast: flagged by the create page right before redirecting here.
  React.useEffect(() => {
    let timer: number | undefined;
    try {
      const createdId = window.sessionStorage.getItem(CREATED_PARTY_FLAG);
      if (createdId && createdId === party.id) {
        /* eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount */
        setCreatedToast(true);
        window.sessionStorage.removeItem(CREATED_PARTY_FLAG);
        timer = window.setTimeout(() => setCreatedToast(false), 6000);
      }
    } catch {
      // storage unavailable — skip the toast silently
    }
    return () => window.clearTimeout(timer);
  }, [party.id]);

  const onJoin = () => {
    setJoinError(null);
    setJustRequested(false);
    const result = requestJoin(party.id);
    if (!result.ok) {
      setJoinError(
        result.reason === "full"
          ? "Availability rechecked — the last spot was just taken."
          : result.reason === "past"
            ? "This activity already happened."
            : "Could not send the request. Try again."
      );
    } else {
      setJustRequested(true);
    }
  };

  const creator = getProfile(party.creatorId);
  const pending = pendingRequests(party);

  return (
    <>
      <Head>
        <title>{party.title} · CONNEX</title>
      </Head>

      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Go back" onClick={() => router.back()}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="text-sm text-muted-foreground">Party details</span>
        </div>

        <header className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={party.category} />
            <Badge variant="outline">
              {party.requiresApproval ? "Host approves requests" : "Instant join"}
            </Badge>
            {past ? (
              <Badge variant="outline" className="gap-1">
                <Clock3 aria-hidden="true" /> Already happened
              </Badge>
            ) : null}
            {full && !past ? (
              <Badge variant="secondary" className="gap-1">
                <Users aria-hidden="true" /> Party is full
              </Badge>
            ) : null}
            {status === "joined" ? (
              <Badge variant="secondary" className="gap-1">
                <Check aria-hidden="true" /> You’re in
              </Badge>
            ) : null}
            {status === "requested" ? (
              <Badge variant="secondary" className="gap-1">
                <Hourglass aria-hidden="true" /> Request pending
              </Badge>
            ) : null}
            {isCreator ? <Badge variant="secondary">You’re hosting</Badge> : null}
          </div>
          <h1 className="font-heading heading-1 font-semibold tracking-tight">{party.title}</h1>
          <p className="text-sm leading-relaxed text-foreground/90">{party.description}</p>
        </header>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-5">
            <Card size="sm">
              <CardContent className="flex flex-col gap-3 pt-1">
                <DetailRow
              icon={<CalendarDays aria-hidden="true" />}
              label="When"
              value={
                party.endTime
                  ? `${formatWhen(party.date, party.time)} – ${formatTime(party.endTime)}`
                  : formatWhen(party.date, party.time)
              }
            />
                <DetailRow
                  icon={<MapPin aria-hidden="true" />}
                  label="Where"
                  value={`${party.location} · ${party.area}`}
                />
                {party.locationPin ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <MapPinPreview pin={party.locationPin} />
                    <p className="text-xs text-muted-foreground">
                      Exact spot pinned by the host.
                    </p>
                  </div>
                ) : null}
                <DetailRow
                  icon={<Banknote aria-hidden="true" />}
                  label="Est. cost"
                  value={formatBudgetPerPerson(party.budgetPerPerson)}
                />
                <DetailRow
                  icon={<Users aria-hidden="true" />}
                  label="Crew"
                  value={
                    party.capacity === null
                      ? `${accepted.length} confirmed · open group${pending.length > 0 ? ` · ${pending.length} pending` : ""}`
                      : `${accepted.length}/${party.capacity} confirmed${pending.length > 0 ? ` · ${pending.length} pending` : ""}`
                  }
                />
                {party.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {party.interests.map((interest) => (
                      <Badge key={interest} variant="outline">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {creator ? (
              <Link
                href={`/profile/${creator.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 outline-none transition-colors hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ParticipantAvatar profile={creator} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {creator.name}
                    {creator.id === currentUserId ? " (you)" : ""}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Organiser · {creator.faculty} · {creator.year}
                  </span>
                </div>
              </Link>
            ) : null}

        <section aria-labelledby="participants-heading" className="flex flex-col gap-2">
          <h2 id="participants-heading" className="font-heading heading-3 font-semibold">
            Crew ({accepted.length})
          </h2>
          <ul className="flex flex-col gap-1.5">
            {accepted.map((participant) => {
              const profile = getProfile(participant.profileId);
              return (
                <li key={participant.profileId}>
                  <Link
                    href={`/profile/${participant.profileId}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <ParticipantAvatar profile={profile} size="sm" />
                    <span className="text-sm">
                      {profile?.name ?? "Unknown"}
                      {participant.profileId === currentUserId ? " (you)" : ""}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">Confirmed</span>
                  </Link>
                </li>
              );
            })}
            {accepted.length === 0 ? (
              <li className="text-sm text-muted-foreground">No confirmed members yet.</li>
            ) : null}
          </ul>
        </section>

        {isCreator && pending.length > 0 ? (
          <section aria-labelledby="requests-heading" className="flex flex-col gap-2">
            <h2 id="requests-heading" className="font-heading heading-3 font-semibold">
              Join requests ({pending.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {pending.map((participant) => {
                const profile = getProfile(participant.profileId);
                return (
                  <li
                    key={participant.profileId}
                    className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5"
                  >
                    <ParticipantAvatar profile={profile} size="sm" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{profile?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {profile?.faculty} · {profile?.year}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => acceptRequest(party.id, participant.profileId)}>
                        <Check data-icon="inline-start" aria-hidden="true" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declineRequest(party.id, participant.profileId)}
                      >
                        <X data-icon="inline-start" aria-hidden="true" />
                        Decline
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              Accepting confirms their spot. Pending requests do not take a spot until accepted.
            </p>
          </section>
        ) : null}

            {isCreator ? (
              <Button variant="destructive" className="self-start" onClick={() => setConfirmDelete(true)}>
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                Delete this plan
              </Button>
            ) : null}
          </div>

          <div className="self-start lg:sticky lg:top-6">
            <JoinPanel
              status={status}
              past={past}
              full={full}
              requiresApproval={party.requiresApproval}
              joinError={joinError}
              justRequested={justRequested && status === "requested"}
              onJoin={onJoin}
              onCancelRequest={() => cancelRequest(party.id)}
              onOpenLeave={() => setConfirmLeave(true)}
              chatHref={`/parties/${party.id}/chat`}
            />
          </div>
        </div>

        <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave this party?</DialogTitle>
              <DialogDescription>
                Your spot opens up for someone else. You can request to join again later.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Stay</DialogClose>
              <Button
                onClick={() => {
                  leaveParty(party.id);
                  setConfirmLeave(false);
                  setJustRequested(false);
                }}
              >
                Leave party
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this plan?</DialogTitle>
              <DialogDescription>
                This removes the plan and its chat for everyone in this prototype browser.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Keep it</DialogClose>
              <Button
                onClick={() => {
                  deleteParty(party.id);
                  setConfirmDelete(false);
                  router.push("/");
                }}
              >
                Delete plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {createdToast ? (
          <div
            role="status"
            className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-xl border bg-card p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 lg:bottom-6"
          >
            <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm font-medium">Plan created</p>
              <p className="text-xs text-muted-foreground">
                Your plan is live — people can find it in Discover and Search.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setCreatedToast(false)}
              className="rounded-lg p-1 text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 text-muted-foreground">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

function JoinPanel({
  status,
  past,
  full,
  requiresApproval,
  joinError,
  justRequested,
  onJoin,
  onCancelRequest,
  onOpenLeave,
  chatHref,
}: {
  status: "none" | "requested" | "joined" | "creator";
  past: boolean;
  full: boolean;
  requiresApproval: boolean;
  joinError: string | null;
  justRequested: boolean;
  onJoin: () => void;
  onCancelRequest: () => void;
  onOpenLeave: () => void;
  chatHref: string;
}) {
  return (
    <Card size="sm" className="gap-3">
      <CardHeader>
        <CardTitle>
          {status === "creator"
            ? "Hosting"
            : status === "joined"
              ? "You’re in"
              : status === "requested"
                ? "Request pending"
                : full && !past
                  ? JOIN_COPY.full.title
                  : past
                    ? JOIN_COPY.past.title
                    : "Join this party"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {status === "none" && !past && !full ? (
          <>
            <Button size="lg" onClick={onJoin}>
              <UserRoundPlus data-icon="inline-start" aria-hidden="true" />
              {requiresApproval ? "Request to join" : "Join party"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {requiresApproval
                ? "Sending a request is not a confirmed spot yet — the organiser approves it."
                : "You’ll be confirmed immediately — the group chat opens right after."}
            </p>
          </>
        ) : null}

        {status === "none" && (full || past) ? (
          <p className="text-sm text-muted-foreground">
            {full && !past ? JOIN_COPY.full.body : JOIN_COPY.past.body}
          </p>
        ) : null}

        {joinError ? <ErrorState title="Couldn’t send request" body={joinError} /> : null}

        {status === "requested" ? (
          <>
            {justRequested ? (
              <SuccessBanner
                title="Request sent"
                body="The organiser will confirm your spot. In this prototype the host auto-approves in a moment."
              />
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hourglass aria-hidden="true" className="size-4" />
                Waiting for the organiser to confirm your spot…
                <span className="text-xs">(auto-approved in this prototype)</span>
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancelRequest}>
                Cancel request
              </Button>
              <Button variant="ghost" disabled>
                <MessageCircle data-icon="inline-start" aria-hidden="true" />
                Chat opens after approval
              </Button>
            </div>
          </>
        ) : null}

        {status === "joined" ? (
          <>
            <SuccessBanner title="You’re in — see you there!" />
            <div className="flex flex-wrap gap-2">
              <Button render={<Link href={chatHref} />}>
                <MessageCircle data-icon="inline-start" aria-hidden="true" />
                Open group chat
              </Button>
              <Button variant="outline" onClick={onOpenLeave}>
                Leave party
              </Button>
            </div>
          </>
        ) : null}

        {status === "creator" ? (
          <>
            <p className="text-sm text-muted-foreground">
              You’re hosting this plan. Manage join requests under ’crew’ section and coordinate in the chat.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button render={<Link href={chatHref} />}>
                <MessageCircle data-icon="inline-start" aria-hidden="true" />
                Open group chat
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Loading party details">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className={cn("h-40 rounded-xl")} />
    </div>
  );
}
