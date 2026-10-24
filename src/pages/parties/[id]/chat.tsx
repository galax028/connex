import * as React from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { EmptyState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMessageTime, plural } from "@/lib/format";
import { approvedParticipants } from "@/lib/participants";
import { getParty } from "@/lib/supabase/queries/get-party";
import type { PartyDetail } from "@/lib/supabase/queries/types";
import { createUserServerClient } from "@/lib/supabase/server";
import { ArrowLeft, Send } from "lucide-react";

export interface PartyChatProps {
  notFound: boolean;
  party?: PartyDetail;
  userId?: string;
  canChat?: boolean;
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

  const party = await getParty(supabase, id);
  if (!party) return { props: { notFound: true } };

  // Server-side membership gate: organiser or own approved row.
  const canChat =
    party.organiserId === user.id ||
    party.participants.some(
      (participant) => participant.id === user.id && participant.status === "approved",
    );

  return { props: { notFound: false, party, userId: user.id, canChat } };
};

export default function PartyChatPage({
  notFound,
  party,
  userId = "",
  canChat = false,
}: PartyChatProps) {
  if (notFound || !party) {
    return (
      <EmptyState
        title="Chat not found"
        body="This plan may have been removed."
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

  return <PartyChatView key={party.id} party={party} userId={userId} />;
}

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
}

const chatStorageKey = (partyId: string) => `connex.chat.${partyId}`;

/**
 * Chat stays local-only (no messages table): messages persist per-browser in
 * localStorage, keyed by party.
 */
function useLocalMessages(partyId: string, userId: string) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(chatStorageKey(partyId));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        /* eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount */
        setMessages(
          parsed.filter(
            (m): m is ChatMessage =>
              !!m &&
              typeof (m as ChatMessage).id === "string" &&
              typeof (m as ChatMessage).body === "string" &&
              typeof (m as ChatMessage).createdAt === "string",
          ),
        );
      }
    } catch {
      // storage unavailable — chat simply starts empty
    }
  }, [partyId]);

  const send = (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const message: ChatMessage = {
      id: `m-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => {
      const next = [...prev, message];
      try {
        window.localStorage.setItem(chatStorageKey(partyId), JSON.stringify(next));
      } catch {
        // storage unavailable — message stays in memory for this visit
      }
      return next;
    });
  };

  return { messages, send };
}

function PartyChatView({ party, userId }: { party: PartyDetail; userId: string }) {
  const router = useRouter();
  const accepted = approvedParticipants(party);
  const { messages, send } = useLocalMessages(party.id, userId);

  const [draft, setDraft] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
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
              {plural(accepted.length, "member", "members")} · prototype chat, messages stay in your
              browser
            </p>
          </div>
        </div>

        {messages.length === 0 ? (
          <EmptyState
            className="my-6"
            title="No messages yet"
            body="Break the ice — say hi and confirm the meeting point."
          />
        ) : (
          <ol className="flex flex-col gap-2.5 py-2" aria-label="Chat messages">
            {messages.map((message) => (
              <li key={message.id} className="flex items-end justify-end gap-2">
                <div className="flex max-w-[78%] flex-col gap-0.5 rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground">
                  <p className="text-sm leading-snug whitespace-pre-wrap">{message.body}</p>
                  <span className="text-[0.65rem] text-primary-foreground/70">
                    {formatMessageTime(message.createdAt)}
                  </span>
                </div>
              </li>
            ))}
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
          <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send message">
            <Send aria-hidden="true" />
          </Button>
        </form>
      </div>
    </>
  );
}
