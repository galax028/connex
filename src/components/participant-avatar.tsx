import Link from "next/link";

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import type { Participant, Profile } from "@/lib/data/types";

export function ParticipantAvatar({
  profile,
  size = "default",
  href,
  className,
}: {
  profile: Profile | undefined;
  size?: "sm" | "default" | "lg";
  href?: string;
  className?: string;
}) {
  const avatar = (
    <Avatar size={size} className={className}>
      <AvatarFallback style={profile ? { backgroundColor: `${profile.color}22` } : undefined}>
        <span style={profile ? { color: profile.color } : undefined} className="font-medium">
          {profile?.initials ?? "?"}
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
  getProfile,
  className,
  hrefs = true,
}: {
  participants: Participant[];
  getProfile: (id: string) => Profile | undefined;
  className?: string;
  hrefs?: boolean;
}) {
  const shown = participants.slice(0, 5);
  const rest = participants.length - shown.length;
  return (
    <AvatarGroup className={className}>
      {shown.map((participant) => (
        <ParticipantAvatar
          key={participant.profileId}
          profile={getProfile(participant.profileId)}
          href={hrefs ? `/profile/${participant.profileId}` : undefined}
          size="sm"
        />
      ))}
      {rest > 0 ? <AvatarGroupCount>+{rest}</AvatarGroupCount> : null}
    </AvatarGroup>
  );
}

export function participantCountLabel(
  participants: Participant[],
  capacity: number | null
): string {
  const accepted = participants.filter((p) => p.status === "accepted").length;
  if (capacity === null) return `${accepted} going · open group`;
  const left = Math.max(0, capacity - accepted);
  if (left === 0) return `Full · ${accepted}/${capacity}`;
  return `${accepted}/${capacity} · ${left} ${left === 1 ? "spot" : "spots"} left`;
}
