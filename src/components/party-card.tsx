import Link from "next/link";
import { AiBadge } from "@/components/ai-badge";
import { CategoryChip } from "@/components/category-chip";
import { ParticipantStack, participantCountLabel } from "@/components/participant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inferArea } from "@/lib/areas";
import { formatBudgetPerPerson, formatWhen, isPast } from "@/lib/format";
import type { MyStatus } from "@/lib/participants";
import { approvedParticipants } from "@/lib/participants";
import type { PartySummary } from "@/lib/supabase/queries/types";
import { cn } from "cn";
import { CircleCheck, Clock3, Hourglass, MessageCircle } from "lucide-react";

export type PartyCardTone = "default" | "ai" | "compact";

export function PartyCard({
  party,
  getMyStatus,
  aiReason,
  tone = "default",
  chatHref,
  chatDisabled,
  nonInteractive,
  className,
}: {
  party: PartySummary;
  getMyStatus?: (party: PartySummary) => MyStatus;
  aiReason?: string;
  /** "primary" rethemes the card in the brand pink (e.g. plans you created). */
  tone?: "default" | "primary";
  /** When set, the card carries a full-width chat shortcut (My Activities). */
  chatHref?: string;
  chatDisabled?: boolean;
  /** Renders the card without links (e.g. the create-page preview). */
  nonInteractive?: boolean;
  className?: string;
}) {
  const accepted = approvedParticipants(party);
  const past = isPast(party.timeStart);
  const full = party.maxSlots !== null && accepted.length >= party.maxSlots;
  const myStatus = getMyStatus?.(party) ?? "none";
  const href = `/parties/${party.id}`;

  return (
    <Card
      size="sm"
      className={cn(
        "relative gap-2.5 transition-shadow focus-within:ring-3 focus-within:ring-ring/50",
        !nonInteractive && "hover:shadow-md",
        past && "opacity-70",
        tone === "primary" && "bg-primary/5 ring-primary/30",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-4">
        <CategoryChip category={party.categoryName} />
        {myStatus === "joined" ? (
          <Badge variant="secondary" className="gap-1">
            <CircleCheck aria-hidden="true" /> Joined
          </Badge>
        ) : myStatus === "requested" ? (
          <Badge variant="secondary" className="gap-1">
            <Hourglass aria-hidden="true" /> Request pending
          </Badge>
        ) : myStatus === "creator" ? (
          <Badge variant="secondary">Your plan</Badge>
        ) : null}
        {past ? (
          <Badge variant="outline" className="gap-1">
            <Clock3 aria-hidden="true" /> Past
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 px-4">
        <h3 className="line-clamp-2 font-heading heading-5 font-medium">
          {nonInteractive ? (
            <span className="relative">{party.title}</span>
          ) : (
            <Link
              href={href}
              className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="relative">{party.title}</span>
            </Link>
          )}
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatWhen(party.timeStart)} · {inferArea(party.location)}
        </p>
      </div>

      {aiReason ? (
        <p className="flex items-start gap-1.5 px-4 text-xs text-muted-foreground">
          <AiBadge /> <span className="min-w-0">{aiReason}</span>
        </p>
      ) : null}

      <div
        className={cn(
          "mt-auto -mb-(--card-spacing) flex flex-col gap-2.5 border-t px-4 py-2.5",
          tone === "primary" ? "border-primary/20 bg-primary/10" : "bg-muted/50",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <ParticipantStack
            participants={accepted}
            hrefs={!nonInteractive}
            className="relative z-10"
          />
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-sm font-medium">
              {formatBudgetPerPerson(party.budgetPerPerson)}
            </span>
            <span
              className={cn(
                "text-xs",
                full ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {participantCountLabel(party.participants, party.maxSlots)}
            </span>
          </div>
        </div>
        {chatHref ? (
          chatDisabled ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              aria-label="Chat opens after approval"
              className="relative z-10 w-full"
            >
              <MessageCircle data-icon="inline-start" aria-hidden="true" />
              Chat opens after approval
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="relative z-10 w-full"
              render={<Link href={chatHref} />}
              aria-label={`Open chat for ${party.title}`}
            >
              <MessageCircle data-icon="inline-start" aria-hidden="true" />
              Open group chat
            </Button>
          )
        ) : null}
      </div>
      {!nonInteractive ? (
        <Link href={href} className="sr-only">
          View party details
        </Link>
      ) : null}
    </Card>
  );
}
