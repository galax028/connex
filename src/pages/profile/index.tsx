import Link from "next/link";
import Head from "next/head";
import * as React from "react";
import { Check, Eye, EyeOff, MessageCircle, Pencil, Plus, Settings2, X } from "lucide-react";

import { ParticipantAvatar } from "@/components/participant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingList } from "@/components/state-views";
import { useApp } from "@/lib/data/store";
import { isPast, plural } from "@/lib/format";
import { fetchInterestTags } from "@/lib/api/interests";
import { cn } from "cn";

export default function MyProfilePage() {
  const {
    hydrated,
    profiles,
    parties,
    myStatusFor,
    currentUserId,
    privacy,
    setPrivacy,
    updateProfile,
  } = useApp();
  const me = profiles.find((p) => p.id === currentUserId);
  const now = React.useMemo(() => new Date(), []);

  // Interest tags come from the (simulated) server tag list.
  const [apiTags, setApiTags] = React.useState<string[] | null>(null);
  const [tagsError, setTagsError] = React.useState(false);
  const [tagsRetry, setTagsRetry] = React.useState(0);

  const [editingProfile, setEditingProfile] = React.useState(false);
  const [bioDraft, setBioDraft] = React.useState<string | null>(null);
  const [bioError, setBioError] = React.useState<string | null>(null);
  const [tagDraft, setTagDraft] = React.useState("");
  const [tagError, setTagError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const tags = await fetchInterestTags();
        if (!cancelled) {
          setApiTags(tags);
          setTagsError(false);
        }
      } catch {
        if (!cancelled) setTagsError(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tagsRetry]);

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

  const saveProfile = () => {
    const trimmed = (bioDraft ?? "").trim();
    if (!trimmed) {
      setBioError("Bio can’t be empty — write a line about yourself.");
      return;
    }
    updateProfile({ bio: trimmed });
    setBioDraft(null);
    setBioError(null);
    setTagDraft("");
    setTagError(null);
    setEditingProfile(false);
  };

  const exitProfileEdit = () => {
    setEditingProfile(false);
    setBioDraft(null);
    setBioError(null);
    setTagDraft("");
    setTagError(null);
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (tag.length > 24) {
      setTagError("Keep tags under 24 characters.");
      return;
    }
    if (me.interests.some((i) => i.toLowerCase() === tag)) {
      setTagError(`“${tag}” is already on your profile.`);
      return;
    }
    if (me.interests.length >= 12) {
      setTagError("Up to 12 tags — remove one first.");
      return;
    }
    updateProfile({ interests: [...me.interests, tag] });
    setTagDraft("");
    setTagError(null);
  };

  const removeTag = (tag: string) => {
    updateProfile({ interests: me.interests.filter((i) => i !== tag) });
    setTagError(null);
  };

  const suggestions = (apiTags ?? [])
    .filter((tag) => !me.interests.some((i) => i.toLowerCase() === tag))
    .slice(0, 8);

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
          <h1 className="font-heading heading-1 font-semibold tracking-tight">Your profile</h1>
          <p className="text-sm text-muted-foreground">
            Prototype account — fixed mock user, no real login.
          </p>
        </header>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-5">
            <Card size="sm">
              <CardContent className="flex flex-col gap-4 pt-1">
                <div className="flex items-start gap-4">
                  <ParticipantAvatar profile={me} size="lg" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-heading heading-3 font-semibold">{me.name} (you)</p>
                        <p className="text-sm text-muted-foreground">
                          {me.faculty} · {me.year}
                        </p>
                      </div>
                      {editingProfile ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exitProfileEdit}
                        >
                          <X data-icon="inline-start" aria-hidden="true" />
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProfile(true);
                            setBioDraft(me.bio);
                            setBioError(null);
                          }}
                        >
                          <Pencil data-icon="inline-start" aria-hidden="true" />
                          Edit profile
                        </Button>
                      )}
                    </div>

                    {editingProfile ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="bio-input">Bio</Label>
                        <Textarea
                          id="bio-input"
                          value={bioDraft ?? ""}
                          onChange={(event) => {
                            setBioDraft(event.target.value);
                            setBioError(null);
                          }}
                          maxLength={280}
                          rows={3}
                          aria-invalid={!!bioError}
                          aria-describedby={bioError ? "bio-error" : undefined}
                        />
                        {bioError ? (
                          <p id="bio-error" role="alert" className="text-xs font-medium text-destructive">
                            {bioError}
                          </p>
                        ) : null}
                        <div className="flex justify-end">
                          <span className="text-xs text-muted-foreground">{(bioDraft ?? "").length}/280</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/90">{me.bio}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t pt-4">
                  <Label id="interests-label">Interests</Label>

                  {me.interests.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Your interests">
                      {me.interests.map((interest) => (
                        <li key={interest}>
                          <Badge variant="outline" className={cn("border-primary gap-1", editingProfile && "pr-1")}>
                            {interest}
                            {editingProfile ? (
                              <button
                                type="button"
                                onClick={() => removeTag(interest)}
                                aria-label={`Remove interest ${interest}`}
                                className="rounded-full p-0.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                              >
                                <X aria-hidden="true" className="size-3" />
                              </button>
                            ) : null}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {editingProfile
                        ? "No tags yet — add your first one below."
                        : "No tags yet — edit profile to add what you’re into."}
                    </p>
                  )}

                  {editingProfile ? (
                    <div className="flex flex-col gap-2">
                      {tagsError ? (
                        <ErrorState
                          title="Couldn’t load suggested tags"
                          body="The tag list didn’t come through. Try again."
                          onRetry={() => setTagsRetry((n) => n + 1)}
                        />
                      ) : apiTags === null ? (
                        <div className="flex flex-wrap gap-1.5" role="status" aria-label="Loading suggested tags">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                          <Skeleton className="h-6 w-14 rounded-full" />
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="sr-only">Suggested tags:</span>
                          {suggestions.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => addTag(tag)}
                              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              <Plus aria-hidden="true" className="mr-0.5 inline size-3" />
                              {tag}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          addTag(tagDraft);
                        }}
                        className="flex gap-2"
                      >
                        <label htmlFor="tag-input" className="sr-only">
                          Add a tag
                        </label>
                        <Input
                          id="tag-input"
                          value={tagDraft}
                          onChange={(event) => {
                            setTagDraft(event.target.value);
                            setTagError(null);
                          }}
                          placeholder="Add a tag…"
                          maxLength={24}
                          autoComplete="off"
                          className="h-8"
                        />
                        <Button type="submit" size="sm" variant="outline">
                          <Plus data-icon="inline-start" aria-hidden="true" />
                          Add
                        </Button>
                      </form>
                      {tagError ? (
                        <p role="alert" className="text-xs font-medium text-destructive">
                          {tagError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {editingProfile ? (
                  <Button className="w-full" onClick={saveProfile}>
                    <Check data-icon="inline-start" aria-hidden="true" />
                    Save changes
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-2">
              <StatTile label="Joined" value={plural(joined.length, "party", "parties")} href="/my" />
              <StatTile label="Created" value={plural(created.length, "party", "parties")} href="/my" />
            </div>

            <section aria-labelledby="my-parties-heading" className="flex flex-col gap-2">
              <h2 id="my-parties-heading" className="font-heading heading-3 font-semibold">
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
      <span className="font-heading heading-3 font-semibold">{value}</span>
    </Link>
  );
}
