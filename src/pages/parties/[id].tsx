import * as React from "react";
import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CategoryChip } from "@/components/category-chip";
import { ParticipantAvatar } from "@/components/participant-avatar";
import { ShareButtons } from "@/components/share-buttons";
import { EmptyState, ErrorState, SuccessBanner } from "@/components/state-views";
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
import { inferArea } from "@/lib/areas";
import { CREATED_PARTY_FLAG } from "@/lib/created-party";
import { consumeDataMutated, markDataMutated } from "@/lib/data-version";
import {
  formatBudgetPerPerson,
  formatEnrolmentYear,
  formatTime,
  formatWhen,
  isPast,
} from "@/lib/format";
import { approvedParticipants, deriveMyStatus, pendingRequests } from "@/lib/participants";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { getParty } from "@/lib/supabase/queries/get-party";
import { getProfile } from "@/lib/supabase/queries/get-profile";
import type { PartyDetail, ProfileSummary } from "@/lib/supabase/queries/types";
import { createUserServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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

const MapPinPreview = dynamic(
  () => import("@/components/map-pin-picker").then((m) => m.MapPinPreview),
  {
    ssr: false,
    loading: () => <div className="h-40 w-full rounded-xl border bg-muted" />,
  },
);

export interface PartyDetailsProps {
  notFound: boolean;
  party?: PartyDetail;
  organiser?: ProfileSummary | null;
  userId?: string;
}

export const getServerSideProps: GetServerSideProps<PartyDetailsProps> = async ({
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

  const party = await getParty(supabase, id);
  if (!party) return { props: { notFound: true } };

  const organiser = await getProfile(supabase, party.organiserId);

  return {
    props: { notFound: false, party, organiser, userId: user.id },
  };
};

export default function PartyDetailsPage({
  notFound,
  party,
  organiser = null,
  userId = "",
}: PartyDetailsProps) {
  if (notFound || !party) {
    return (
      <EmptyState
        title="Party not found"
        body="This party may have been removed, or the link is from another account."
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
  return <PartyDetailsView key={party.id} party={party} organiser={organiser} userId={userId} />;
}

const JOIN_COPY = {
  full: {
    title: "Party is full",
    body: "All spots are taken. Browse other activities — new parties are posted all the time.",
  },
  past: {
    title: "This activity already happened",
    body: "It stays in the history of everyone who joined.",
  },
} as const;

/**
 * Recomputes `parties.taken_slots` from the current approved-row count after
 * every parties_users mutation (recompute-and-set — never +1/−1). Returns
 * "full" when the capacity CHECK rejected the write.
 */
async function syncTakenSlots(
  supabase: SupabaseClient<Database>,
  partyId: string,
): Promise<"ok" | "full" | "error"> {
  const { count, error: countError } = await supabase
    .from("parties_users")
    .select("user_id", { count: "exact", head: true })
    .eq("party_id", partyId)
    .eq("status", "approved");
  if (countError) return "error";
  const approvedCount = count ?? 0;

  const { error } = await supabase
    .from("parties")
    .update({ taken_slots: approvedCount })
    .eq("id", partyId);
  if (error) {
    return error.code === "23514" ? "full" : "error";
  }
  return "ok";
}

function PartyDetailsView({
  party,
  organiser,
  userId,
}: {
  party: PartyDetail;
  organiser: ProfileSummary | null;
  userId: string;
}) {
  const router = useRouter();

  const status = deriveMyStatus(party, userId);
  const past = isPast(party.timeStart);
  const accepted = approvedParticipants(party);
  const full = party.maxSlots !== null && accepted.length >= party.maxSlots;
  const isCreator = party.organiserId === userId;

  const [busy, setBusy] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [justRequested, setJustRequested] = React.useState(false);
  const [confirmLeave, setConfirmLeave] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [createdToast, setCreatedToast] = React.useState(false);

  const supabase = createBrowserClient();
  const refresh = () => router.replace(router.asPath);

  // Back/forward navigation restores cached props — refetch once when another
  // page or tab mutated this party recently so the crew counts stay truthful.
  // Own mutations re-render this instance in place, so they don't re-run this.
  React.useEffect(() => {
    if (consumeDataMutated()) void router.replace(router.asPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: consume the staleness flag once per mount
  }, []);

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

  const onJoin = async () => {
    setJoinError(null);
    setJustRequested(false);
    if (full) {
      setJoinError("Availability rechecked — the last spot was just taken.");
      return;
    }
    if (past) {
      setJoinError("This activity already happened.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("parties_users").insert({
        party_id: party.id,
        user_id: userId,
        status: party.approvalRequired ? "pending" : "approved",
      });
      if (error) {
        setJoinError(
          error.code === "23514"
            ? "Availability rechecked — the last spot was just taken."
            : "Could not send the request. Try again.",
        );
        return;
      }
      await syncTakenSlots(supabase, party.id);
      markDataMutated();
      setJustRequested(true);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onRemoveOwnRow = async () => {
    setJoinError(null);
    setBusy(true);
    try {
      const { error } = await supabase
        .from("parties_users")
        .delete()
        .eq("party_id", party.id)
        .eq("user_id", userId);
      if (error) {
        setJoinError("Could not update your spot. Try again.");
        return;
      }
      await syncTakenSlots(supabase, party.id);
      markDataMutated();
      setJustRequested(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onAccept = async (participantId: string) => {
    setJoinError(null);
    if (full) {
      setJoinError("Party is full — free up a spot before accepting more requests.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("parties_users")
        .update({ status: "approved" })
        .eq("party_id", party.id)
        .eq("user_id", participantId);
      if (error) {
        setJoinError(
          error.code === "23514"
            ? "Party is full — the last spot was just taken."
            : "Could not accept the request. Try again.",
        );
        return;
      }
      const synced = await syncTakenSlots(supabase, party.id);
      if (synced === "full") {
        setJoinError("Party is full — the last spot was just taken.");
      }
      markDataMutated();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async (participantId: string) => {
    setJoinError(null);
    setBusy(true);
    try {
      const { error } = await supabase
        .from("parties_users")
        .delete()
        .eq("party_id", party.id)
        .eq("user_id", participantId);
      if (error) {
        setJoinError("Could not decline the request. Try again.");
        return;
      }
      await syncTakenSlots(supabase, party.id);
      markDataMutated();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("parties").delete().eq("id", party.id);
      if (error) {
        setJoinError("Could not delete the party. Try again.");
        setConfirmDelete(false);
        return;
      }
      markDataMutated();
      router.push("/");
    } finally {
      setBusy(false);
    }
  };

  const pending = pendingRequests(party);

  return (
    <>
      <Head>
        <title>{party.title} · CONNEX</title>
      </Head>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Go back" onClick={() => router.back()}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="text-sm text-muted-foreground">Party details</span>
          <ShareButtons
            title={party.title}
            text={`Check out this party on CONNEX: ${party.title}`}
            className="ml-auto"
          />
        </div>

        <header className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={party.categoryName} />
            <Badge variant="outline">
              {party.approvalRequired ? "Host approves requests" : "Instant join"}
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
          {party.description ? (
            <p className="text-sm leading-relaxed text-foreground/90">{party.description}</p>
          ) : null}
        </header>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-5">
            <Card size="sm">
              <CardContent className="flex flex-col gap-3 pt-1">
                <DetailRow
                  icon={<CalendarDays aria-hidden="true" />}
                  label="When"
                  value={
                    party.timeEnd
                      ? `${formatWhen(party.timeStart)} – ${formatTime(party.timeEnd)}`
                      : formatWhen(party.timeStart)
                  }
                />
                <DetailRow
                  icon={<MapPin aria-hidden="true" />}
                  label="Where"
                  value={`${party.location} · ${inferArea(party.location)}`}
                />
                {party.locationPin ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <MapPinPreview pin={party.locationPin} />
                    <p className="text-xs text-muted-foreground">Exact spot pinned by the host.</p>
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
                    party.maxSlots === null
                      ? `${accepted.length} confirmed · open group${pending.length > 0 ? ` · ${pending.length} pending` : ""}`
                      : `${accepted.length}/${party.maxSlots} confirmed${pending.length > 0 ? ` · ${pending.length} pending` : ""}`
                  }
                />
                {party.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {party.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {organiser ? (
              <Link
                href={`/profile/${organiser.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ParticipantAvatar profile={organiser} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {organiser.name}
                    {organiser.id === userId ? " (you)" : ""}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Organiser · {organiser.facultyName}
                    {formatEnrolmentYear(organiser.enrolmentYear)
                      ? ` · ${formatEnrolmentYear(organiser.enrolmentYear)}`
                      : ""}
                  </span>
                </div>
              </Link>
            ) : null}

            <section aria-labelledby="participants-heading" className="flex flex-col gap-2">
              <h2 id="participants-heading" className="font-heading heading-3 font-semibold">
                Crew ({accepted.length})
              </h2>
              <ul className="flex flex-col gap-1.5">
                {accepted.map((participant) => (
                  <li key={participant.id}>
                    <Link
                      href={`/profile/${participant.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <ParticipantAvatar profile={participant} size="sm" />
                      <span className="text-sm">
                        {participant.name}
                        {participant.id === userId ? " (you)" : ""}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">Confirmed</span>
                    </Link>
                  </li>
                ))}
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
                  {pending.map((participant) => (
                    <li
                      key={participant.id}
                      className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5"
                    >
                      <ParticipantAvatar profile={participant} size="sm" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{participant.name}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" disabled={busy} onClick={() => onAccept(participant.id)}>
                          <Check data-icon="inline-start" aria-hidden="true" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => onDecline(participant.id)}
                        >
                          <X data-icon="inline-start" aria-hidden="true" />
                          Decline
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Accepting confirms their spot. Pending requests do not take a spot until accepted.
                </p>
              </section>
            ) : null}

            {isCreator ? (
              <Button
                variant="destructive"
                className="self-start"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                Delete this party
              </Button>
            ) : null}
          </div>

          <div className="self-start lg:sticky lg:top-6">
            <JoinPanel
              status={status}
              past={past}
              full={full}
              busy={busy}
              requiresApproval={party.approvalRequired}
              joinError={joinError}
              justRequested={justRequested && status === "requested"}
              onJoin={onJoin}
              onCancelRequest={onRemoveOwnRow}
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
                disabled={busy}
                onClick={() => {
                  setConfirmLeave(false);
                  void onRemoveOwnRow();
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
              <DialogTitle>Delete this party?</DialogTitle>
              <DialogDescription>
                This permanently removes the party for everyone — members lose their spot.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Keep it</DialogClose>
              <Button variant="destructive" disabled={busy} onClick={() => void onDelete()}>
                Delete party
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {createdToast ? (
          <div
            role="status"
            className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm animate-in items-start gap-3 rounded-xl border bg-card p-4 shadow-lg duration-300 fade-in slide-in-from-bottom-2 lg:bottom-6"
          >
            <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm font-medium">Party created</p>
              <p className="text-xs text-muted-foreground">
                Your party is live — people can find it in Discover and Search.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setCreatedToast(false)}
              className="rounded-lg p-1 text-muted-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
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
  busy,
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
  busy: boolean;
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
            <Button size="lg" disabled={busy} onClick={onJoin}>
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
              <SuccessBanner title="Request sent" body="The organiser will confirm your spot." />
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hourglass aria-hidden="true" className="size-4" />
                Waiting for the organiser to confirm your spot…
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy} onClick={onCancelRequest}>
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
              <Button variant="outline" disabled={busy} onClick={onOpenLeave}>
                Leave party
              </Button>
            </div>
          </>
        ) : null}

        {status === "creator" ? (
          <>
            <p className="text-sm text-muted-foreground">
              You’re hosting this party. Manage join requests under ’crew’ section and coordinate in
              the chat.
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
