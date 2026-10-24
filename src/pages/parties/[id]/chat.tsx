import * as React from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMessageTime, plural } from "@/lib/format";
import { approvedParticipants } from "@/lib/participants";
import { createBrowserClient } from "@/lib/supabase/client";
import { getParty } from "@/lib/supabase/queries/get-party";
import { getPartyChatMessages } from "@/lib/supabase/queries/get-party-chat-messages";
import type { PartyChatMessage, PartyDetail } from "@/lib/supabase/queries/types";
import { createUserServerClient } from "@/lib/supabase/server";
import { ArrowLeft, Send } from "lucide-react";

export interface PartyChatProps {
  notFound: boolean;
  party?: PartyDetail;
  userId?: string;
  canChat?: boolean;
  messages?: PartyChatMessage[];
}

export const getServerSideProps: GetServerSideProps<PartyChatProps> = async ({
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

  const [party, messages] = await Promise.all([
    getParty(supabase, id),
    getPartyChatMessages(supabase, id),
  ]);
  if (!party) return { props: { notFound: true } };

  // Server-side membership gate: organiser or own approved row.
  const canChat =
    party.organiserId === user.id ||
    party.participants.some(
      (participant) => participant.id === user.id && participant.status === "approved",
    );

  return {
    props: { notFound: false, party, userId: user.id, canChat, messages: messages ?? [] },
  };
};

export default function PartyChatPage({
  notFound,
  party,
  userId = "",
  canChat = false,
  messages = [],
}: PartyChatProps) {
  if (notFound || !party) {
    return (
      <EmptyState
        title="Chat not found"
        body="This party may have been removed."
        actions={
          <Button variant="outline" render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Back to discover
          </Button>
        }
      />
    );
  }

  if (!canChat) {
    const requested = party.participants.some(
      (participant) => participant.id === userId && participant.status === "pending",
    );
    return (
      <EmptyState
        title="Group chat is for confirmed members"
        body={
          requested
            ? "Your join request is pending — the chat opens once the organiser approves you."
            : "Request to join this party first; the chat opens once you're confirmed."
        }
        actions={
          <Button variant="outline" render={<Link href={`/parties/${party.id}`} />}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Back to party
          </Button>
        }
      />
    );
  }

  return <PartyChatView key={party.id} party={party} userId={userId} initialMessages={messages} />;
}

function PartyChatView({
  party,
  userId,
  initialMessages,
}: {
  party: PartyDetail;
  userId: string;
  initialMessages: PartyChatMessage[];
}) {
  const router = useRouter();
  const accepted = approvedParticipants(party);
  const [messages, setMessages] = React.useState(initialMessages);
  const [status, setStatus] = React.useState<"connecting" | "live" | "error" | "unavailable">(
    "connecting",
  );

  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  React.useEffect(() => {
    const supabase = createBrowserClient();
    const profileById = new Map(
      [...party.participants, ...accepted].map((participant) => [participant.id, participant]),
    );
    const channel = supabase
      .channel(`party-chat:${party.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "party_chat_messages",
          filter: `party_id=eq.${party.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            user_id: string;
            created_at: string;
            content: string;
          };
          const profile = profileById.get(row.user_id);
          const message: PartyChatMessage = {
            id: row.id,
            userId: row.user_id,
            content: row.content,
            createdAt: row.created_at,
            senderName: profile?.name ?? "Member",
            senderNickname: profile?.nickname ?? null,
            senderProfileUrl: profile?.profileUrl ?? "",
          };

          setMessages((previous) =>
            previous.some((candidate) => candidate.id === message.id)
              ? previous.map((candidate) => (candidate.id === message.id ? message : candidate))
              : [...previous, message],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "party_chat_messages",
          filter: `party_id=eq.${party.id}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          if (typeof deletedId !== "string") return;
          setMessages((previous) => previous.filter((message) => message.id !== deletedId));
        },
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("live");
        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("error");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [accepted, party.id, party.participants]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    const pendingId = `pending-${crypto.randomUUID()}`;
    setSending(true);
    setDraft("");
    setMessages((previous) => [
      ...previous,
      {
        id: pendingId,
        userId,
        content,
        createdAt: new Date().toISOString(),
        senderName: "",
        senderNickname: null,
        senderProfileUrl: "",
      },
    ]);

    void (async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("party_chat_messages")
          .insert({ party_id: party.id, user_id: userId, content })
          .select()
          .single();

        if (error || !data) {
          setMessages((previous) => previous.filter((message) => message.id !== pendingId));
          setDraft(content);
          setSendError(true);
          return;
        }

        setMessages((previous) =>
          previous.map((message) =>
            message.id === pendingId
              ? {
                  id: data.id,
                  userId: data.user_id,
                  content: data.content,
                  createdAt: data.created_at,
                  senderName: "",
                  senderNickname: null,
                  senderProfileUrl: "",
                }
              : message,
          ),
        );
      } finally {
        setSending(false);
      }
    })();
  };

  return (
    <>
      <Head>
        <title>Chat · {party.title} · CONNEX</title>
      </Head>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 lg:max-w-2xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Go back" onClick={() => router.back()}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading heading-4 font-semibold">{party.title}</h1>
            <p className="text-xs text-muted-foreground">
              {plural(accepted.length, "member", "members")} ·{" "}
              {status === "live"
                ? "live"
                : status === "error"
                  ? "reconnecting"
                  : status === "unavailable"
                    ? "realtime unavailable"
                    : "connecting"}
            </p>
          </div>
        </div>

        {sendError ? (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            Your last message could not be sent. Check your connection and try again.
          </p>
        ) : null}

        {messages.length === 0 ? (
          status === "error" || status === "unavailable" ? (
            <ErrorState
              title={status === "error" ? "Realtime connection failed" : "Realtime unavailable"}
              body="History is current, but new messages may need a refresh. Try again in a moment."
            />
          ) : (
            <EmptyState
              className="my-6"
              title="No messages yet"
              body="Break the ice — say hi and confirm the meeting point."
            />
          )
        ) : (
          <ol className="flex flex-col gap-2.5 py-2" aria-label="Chat messages">
            {messages.map((message, index) => {
              const mine = message.userId === userId;
              const previous = messages[index - 1];
              const showSender = !mine && (!previous || previous.userId !== message.userId);
              const senderLabel = message.senderNickname || message.senderName || "Member";

              return (
                <li
                  key={message.id}
                  className={`flex items-end ${mine ? "justify-end" : "justify-start"} gap-2`}
                >
                  {mine ? (
                    <div className="flex max-w-[78%] flex-col gap-0.5 rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground">
                      <p className="text-sm leading-snug whitespace-pre-wrap">{message.content}</p>
                      <span className="text-[0.65rem] text-primary-foreground/70">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex max-w-[78%] flex-col gap-0.5">
                      {showSender ? (
                        <span className="text-[0.65rem] text-muted-foreground">{senderLabel}</span>
                      ) : null}
                      <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-foreground">
                        <p className="text-sm leading-snug whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <span className="text-[0.65rem] text-muted-foreground">
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            <div ref={bottomRef} />
          </ol>
        )}

        <form
          onSubmit={onSubmit}
          className="sticky bottom-20 flex items-center gap-2 rounded-2xl border bg-background p-2 shadow-sm lg:bottom-4"
        >
          <label htmlFor="chat-input" className="sr-only">
            Message the group
          </label>
          <Input
            id="chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message the group…"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || sending}
            aria-label={sending ? "Sending message" : "Send message"}
          >
            <Send aria-hidden="true" />
          </Button>
        </form>
      </div>
    </>
  );
}
