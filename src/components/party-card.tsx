import Link from "next/link";

import { Card } from "@/components/ui/card";
import { AiBadge } from "@/components/ai-badge";
import { CategoryChip } from "@/components/category-chip";
import {
  ParticipantStack,
  participantCountLabel,
} from "@/components/participant-avatar";
import { formatBudgetPerPerson, formatWhen, isPast } from "@/lib/format";
import type { Party, Profile } from "@/lib/data/types";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { CircleCheck, Clock3, Hourglass } from "lucide-react";

export type PartyCardTone = "default" | "ai" | "compact";

export function PartyCard({
  party,
  getProfile,
  getMyStatus,
  aiReason,
  className,
}: {
  party: Party;
  getProfile: (id: string) => Profile | undefined;
  getMyStatus?: (party: Party) => "none" | "requested" | "joined" | "creator";
  aiReason?: string;
  className?: string;
}) {
  const accepted = party.participants.filter((p) => p.status === "accepted");
  const past = isPast(party.date, party.time);
  const full = party.capacity !== null && accepted.length >= party.capacity;
  const myStatus = getMyStatus?.(party) ?? "none";
  const href = `/parties/${party.id}`;

  return (
    <Card
      size="sm"
      className={cn(
        "relative gap-2.5 pb-0 transition-shadow hover:shadow-md focus-within:ring-3 focus-within:ring-ring/50",
        past && "opacity-70",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4">
        <CategoryChip category={party.category} />
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
        <h3 className="line-clamp-2 font-heading text-[0.95rem] leading-snug font-medium">
          <Link
            href={href}
            className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="relative">{party.title}</span>
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatWhen(party.date, party.time)} · {party.area}
        </p>
      </div>

      {aiReason ? (
        <p className="flex items-start gap-1.5 px-4 text-xs text-muted-foreground">
          <AiBadge /> <span className="min-w-0">{aiReason}</span>
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t bg-muted/50 px-4 py-2.5">
        <ParticipantStack
          participants={accepted}
          getProfile={getProfile}
          className="relative z-10"
        />
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-sm font-medium">{formatBudgetPerPerson(party.budgetPerPerson)}</span>
          <span
            className={cn(
              "text-xs",
              full ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {participantCountLabel(party.participants, party.capacity)}
          </span>
        </div>
      </div>
      <Link href={href} className="sr-only">
        View party details
      </Link>
    </Card>
  );
}
