import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { ArrowLeft, Send } from "lucide-react";

import { ParticipantAvatar } from "@/components/participant-avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingList } from "@/components/state-views";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/data/store";
import { formatMessageTime, plural } from "@/lib/format";
import { cn } from "cn";

function asId(param: string | string[] | undefined): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

export default function PartyChatPage() {
  const router = useRouter();
  const partyId = asId(router.query.id);
  const {
    hydrated,
    getParty,
    getProfile,
    myStatusFor,
    acceptedParticipants,
    messagesFor,
    sendMessage,
    currentUserId,
  } = useApp();

  const party = hydrated && partyId ? getParty(partyId) : undefined;
  const messages = partyId ? messagesFor(partyId) : [];
  const status = party ? myStatusFor(party) : "none";
  const canChat = status === "joined" || status === "creator";

  const [draft, setDraft] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, canChat]);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading chat">
        <LoadingList label="Loading chat…" />
      </div>
    );
  }

  if (!party || !partyId) {
    return (
      <EmptyState
        title={router.isReady ? "Chat not found" : "Loading…"}
        body={router.isReady ? "This plan may have been removed." : undefined}
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
    return (
      <EmptyState
        title="Group chat is for confirmed members"
        body={
          status === "requested"
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

  const accepted = acceptedParticipants(party);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    sendMessage(partyId, draft);
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
              {plural(accepted.length, "member", "members")} · prototype chat, messages stay in
              your browser
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
            {messages.map((message) => {
              const mine = message.authorId === currentUserId;
              const author = getProfile(message.authorId);
              return (
                <li
                  key={message.id}
                  className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
                >
                  {!mine ? <ParticipantAvatar profile={author} size="sm" /> : null}
                  <div
                    className={cn(
                      "flex max-w-[78%] flex-col gap-0.5 rounded-2xl px-3.5 py-2",
                      mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-card ring-1 ring-foreground/10"
                    )}
                  >
                    {!mine ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        {author?.name ?? "Unknown"}
                      </span>
                    ) : null}
                    <p className="text-sm leading-snug whitespace-pre-wrap">{message.body}</p>
                    <span
                      className={cn(
                        "text-[0.65rem]",
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
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
          <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send message">
            <Send aria-hidden="true" />
          </Button>
        </form>
      </div>
    </>
  );
}
