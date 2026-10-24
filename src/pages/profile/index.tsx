import * as React from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ParticipantAvatar } from "@/components/participant-avatar";
import { EmptyState, ErrorState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { consumeDataMutated, markDataMutated } from "@/lib/data-version";
import { formatEnrolmentYear, isPast, plural } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import { getPartiesByOrganiser } from "@/lib/supabase/queries/get-parties-by-organiser";
import { getPartiesByParticipant } from "@/lib/supabase/queries/get-parties-by-participant";
import { getProfile } from "@/lib/supabase/queries/get-profile";
import { getTags } from "@/lib/supabase/queries/get-tags";
import type { PartySummary, ProfileSummary } from "@/lib/supabase/queries/types";
import { createUserServerClient } from "@/lib/supabase/server";
import { cn } from "cn";
import { Check, LogOut, Pencil, Plus, X } from "lucide-react";

export interface MyProfileProps {
  error: boolean;
  userId?: string;
  profile?: ProfileSummary | null;
  tags?: { id: string; name: string }[];
  organised?: PartySummary[];
  joined?: PartySummary[];
}

export const getServerSideProps: GetServerSideProps<MyProfileProps> = async ({ req, res }) => {
  const supabase = createUserServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: "/signin", permanent: false } };

  const [profile, tags, participating, organised] = await Promise.all([
    getProfile(supabase, user.id),
    getTags(supabase),
    getPartiesByParticipant(supabase, user.id),
    getPartiesByOrganiser(supabase, user.id),
  ]);

  if (!profile || !participating || !organised) {
    return { props: { error: true, userId: user.id } };
  }

  const createdIds = organised;
  const joinedIds = participating.filter((party) => party.organiserId !== user.id);

  return {
    props: {
      error: false,
      userId: user.id,
      profile,
      tags: tags ?? [],
      organised: createdIds,
      joined: joinedIds,
    },
  };
};

export default function MyProfilePage({
  error,
  userId = "",
  profile = null,
  tags = [],
  organised = [],
  joined = [],
}: MyProfileProps) {
  const router = useRouter();

  // Profile edits elsewhere (and fresh sign-ins) land via getServerSideProps;
  // re-run it once when another page mutated shared data recently.
  React.useEffect(() => {
    if (consumeDataMutated()) void router.replace(router.asPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: consume the staleness flag once per mount
  }, []);

  const [editingProfile, setEditingProfile] = React.useState(false);
  const [bioDraft, setBioDraft] = React.useState<string | null>(null);
  const [bioError, setBioError] = React.useState<string | null>(null);
  const [tagDraft, setTagDraft] = React.useState("");
  const [tagError, setTagError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const me = profile;

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  if (!me) {
    return (
      <EmptyState
        title="Profile not set up yet"
        body="Your account exists but has no profile row. Try signing out and in again."
        actions={<Button render={<Link href="/" />}>Back to discover</Button>}
      />
    );
  }

  const partyCount = organised.length + joined.length;

  const saveProfile = async () => {
    const trimmed = (bioDraft ?? "").trim();
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("user_profiles")
        .update({ biography: trimmed || null })
        .eq("id", userId);
      if (error) {
        setBioError("Could not save your bio. Try again.");
        return;
      }
      setBioDraft(null);
      setBioError(null);
      setTagDraft("");
      setTagError(null);
      setEditingProfile(false);
      markDataMutated();
      router.replace(router.asPath);
    } finally {
      setSaving(false);
    }
  };

  const exitProfileEdit = () => {
    setEditingProfile(false);
    setBioDraft(null);
    setBioError(null);
    setTagDraft("");
    setTagError(null);
  };

  const addTag = async (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (tag.length > 24) {
      setTagError("Keep tags under 24 characters.");
      return;
    }
    if (me.tags.some((t) => t.name.toLowerCase() === tag)) {
      setTagError(`“${tag}” is already on your profile.`);
      return;
    }
    if (me.tags.length >= 12) {
      setTagError("Up to 12 tags — remove one first.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      // tags.name is UNIQUE and case-sensitive — normalize before lookup/insert.
      const existing = await supabase.from("tags").select("id").eq("name", tag).maybeSingle();
      let tagId = existing.data?.id as string | undefined;
      if (!tagId) {
        const inserted = await supabase.from("tags").insert({ name: tag }).select("id").single();
        if (inserted.error) {
          // Lost an insert race — the tag exists now; re-read it.
          const again = await supabase.from("tags").select("id").eq("name", tag).maybeSingle();
          tagId = again.data?.id as string | undefined;
        } else {
          tagId = inserted.data.id;
        }
      }
      if (!tagId) {
        setTagError("Could not add the tag. Try again.");
        return;
      }
      const { error } = await supabase
        .from("users_tags")
        .insert({ user_id: userId, tag_id: tagId });
      if (error) {
        setTagError("Could not add the tag. Try again.");
        return;
      }
      setTagDraft("");
      setTagError(null);
      markDataMutated();
      router.replace(router.asPath);
    } finally {
      setSaving(false);
    }
  };

  const removeTag = async (tagName: string) => {
    const tagId = me.tags.find((t) => t.name === tagName)?.id;
    if (!tagId) return;
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("users_tags")
        .delete()
        .eq("user_id", userId)
        .eq("tag_id", tagId);
      if (error) {
        setTagError("Could not remove the tag. Try again.");
        return;
      }
      setTagError(null);
      markDataMutated();
      router.replace(router.asPath);
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    // Server route clears the session cookies with the privileged client.
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/signin");
  };

  const suggestions = tags
    .filter((tag) => !me.tags.some((t) => t.name.toLowerCase() === tag.name.toLowerCase()))
    .map((tag) => tag.name)
    .slice(0, 8);

  const yearLabel = formatEnrolmentYear(me.enrolmentYear);

  return (
    <>
      <Head>
        <title>Your profile · CONNEX</title>
      </Head>
      <div className="flex flex-col gap-5">
        <header>
          <h1 className="font-heading heading-1 font-semibold tracking-tight">Your profile</h1>
        </header>

        <div className="flex flex-col gap-5">
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
                          {me.facultyName}
                          {yearLabel ? ` · ${yearLabel}` : ""}
                        </p>
                      </div>
                      {editingProfile ? (
                        <Button variant="outline" size="sm" onClick={exitProfileEdit}>
                          <X data-icon="inline-start" aria-hidden="true" />
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProfile(true);
                            setBioDraft(me.biography ?? "");
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
                          <p
                            id="bio-error"
                            role="alert"
                            className="text-xs font-medium text-destructive"
                          >
                            {bioError}
                          </p>
                        ) : null}
                        <div className="flex justify-end">
                          <span className="text-xs text-muted-foreground">
                            {(bioDraft ?? "").length}/280
                          </span>
                        </div>
                      </div>
                    ) : me.biography ? (
                      <p className="text-sm text-foreground/90">{me.biography}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground/80 italic">
                        No bio yet — edit your profile to introduce yourself.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t pt-4">
                  <Label id="interests-label">Interests</Label>

                  {me.tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Your interests">
                      {me.tags.map((tag) => (
                        <li key={tag.id}>
                          <Badge
                            variant="outline"
                            className={cn("gap-1 border-primary", editingProfile && "pr-1")}
                          >
                            {tag.name}
                            {editingProfile ? (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => removeTag(tag.name)}
                                aria-label={`Remove interest ${tag.name}`}
                                className="rounded-full p-0.5 transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
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
                      {suggestions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="sr-only">Suggested tags:</span>
                          {suggestions.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              disabled={saving}
                              onClick={() => addTag(tag)}
                              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
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
                          void addTag(tagDraft);
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
                        <Button type="submit" size="sm" variant="outline" disabled={saving}>
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
                  <Button className="w-full" disabled={saving} onClick={saveProfile}>
                    <Check data-icon="inline-start" aria-hidden="true" />
                    Save changes
                  </Button>
                ) : null}
              </CardContent>
              <CardFooter className="flex-wrap justify-between gap-x-3 gap-y-2">
                <p className="min-w-0 text-xs text-muted-foreground">
                  Signed in with your Chulalongkorn Google account.
                </p>
                <Button variant="destructive" size="sm" onClick={signOut}>
                  <LogOut data-icon="inline-start" aria-hidden="true" />
                  Sign out
                </Button>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-2">
              <StatTile
                label="Joined"
                value={plural(joined.length, "party", "parties")}
                href="/my"
              />
              <StatTile
                label="Created"
                value={plural(organised.length, "party", "parties")}
                href="/my"
              />
            </div>

            <section aria-labelledby="my-parties-heading" className="flex flex-col gap-2">
              <h2 id="my-parties-heading" className="font-heading heading-3 font-semibold">
                Your parties
              </h2>
              {partyCount > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {organised.map((party) => (
                    <li key={party.id}>
                      <PartyRow party={party} creator />
                    </li>
                  ))}
                  {joined.map((party) => (
                    <li key={party.id}>
                      <PartyRow party={party} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No parties yet"
                  body="Join something or start your own party."
                  actions={
                    <Button render={<Link href="/create" />}>
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      Start a party
                    </Button>
                  }
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function PartyRow({ party, creator }: { party: PartySummary; creator?: boolean }) {
  return (
    <Link
      href={`/parties/${party.id}`}
      className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 transition-colors outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{party.title}</span>
        <span className="text-xs text-muted-foreground">
          {creator ? "Created by you" : "Joined"} · {isPast(party.timeStart) ? "Past" : "Upcoming"}
        </span>
      </div>
    </Link>
  );
}

function StatTile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-0.5 rounded-xl border bg-card px-4 py-3 transition-colors outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-heading heading-3 font-semibold">{value}</span>
    </Link>
  );
}
