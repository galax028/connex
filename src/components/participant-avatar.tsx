import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import type { PartyParticipant } from "@/lib/supabase/queries/types";

const AVATAR_COLORS = [
  "#e11d63",
  "#7c3aed",
  "#0d9488",
  "#d97706",
  "#2563eb",
  "#db2777",
  "#16a34a",
  "#b45309",
  "#4f46e5",
  "#0284c7",
];

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return initials || "?";
}

/** Minimal profile shape both `ProfileSummary` and `PartyParticipant` satisfy. */
export interface AvatarProfile {
  id: string;
  name: string;
  profileUrl: string;
}

export function ParticipantAvatar({
  profile,
  size = "default",
  href,
  className,
}: {
  profile: AvatarProfile | undefined;
  size?: "sm" | "default" | "lg";
  href?: string;
  className?: string;
}) {
  const color = profile ? colorFor(profile.id) : undefined;
  const avatar = (
    <Avatar size={size} className={className}>
      {profile ? <AvatarImage src={profile.profileUrl} alt="" /> : null}
      <AvatarFallback style={color ? { backgroundColor: `${color}22` } : undefined}>
        <span style={color ? { color } : undefined} className="font-medium">
          {profile ? initialsFor(profile.name) : "?"}
        </span>
      </AvatarFallback>
    </Avatar>
  );
  if (!href || !profile) return avatar;
  return (
    <Link
      href={`/profile/${profile.id}`}
      aria-label={`View ${profile.name}'s profile`}
      className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {avatar}
    </Link>
  );
}

export function ParticipantStack({
  participants,
  className,
  hrefs = true,
}: {
  participants: PartyParticipant[];
  className?: string;
  hrefs?: boolean;
}) {
  const shown = participants.slice(0, 5);
  const rest = participants.length - shown.length;
  return (
    <AvatarGroup className={className}>
      {shown.map((participant) => (
        <ParticipantAvatar
          key={participant.id}
          profile={participant}
          href={hrefs ? `/profile/${participant.id}` : undefined}
          size="sm"
        />
      ))}
      {rest > 0 ? <AvatarGroupCount>+{rest}</AvatarGroupCount> : null}
    </AvatarGroup>
  );
}

export function participantCountLabel(
  participants: PartyParticipant[],
  maxSlots: number | null,
): string {
  const approved = participants.filter((p) => p.status === "approved").length;
  if (maxSlots === null) return `${approved} going · open group`;
  const left = Math.max(0, maxSlots - approved);
  if (left === 0) return `Full · ${approved}/${maxSlots}`;
  return `${approved}/${maxSlots} · ${left} ${left === 1 ? "spot" : "spots"} left`;
}
