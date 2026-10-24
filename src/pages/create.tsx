import * as React from "react";
import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import { PartyCard } from "@/components/party-card";
import { ErrorState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { inferArea } from "@/lib/areas";
import { CREATED_PARTY_FLAG } from "@/lib/created-party";
import { markDataMutated } from "@/lib/data-version";
import type { MapPin } from "@/lib/filters";
import { daysFromToday, toBangkokIso } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { getPartyCategories } from "@/lib/supabase/queries/get-party-categories";
import { getProfile } from "@/lib/supabase/queries/get-profile";
import { getTags } from "@/lib/supabase/queries/get-tags";
import { formatPointColumn } from "@/lib/supabase/queries/map-party-summary";
import type { PartySummary, ProfileSummary } from "@/lib/supabase/queries/types";
import { createUserServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cn } from "cn";
import { ArrowLeft, CalendarPlus, Eye, Plus } from "lucide-react";

const MapPinPicker = dynamic(
  () => import("@/components/map-pin-picker").then((m) => m.MapPinPicker),
  {
    ssr: false,
    loading: () => <div className="h-56 w-full rounded-xl border bg-muted sm:h-64" />,
  },
);

export interface CreatePartyProps {
  error: boolean;
  userId?: string;
  me?: ProfileSummary | null;
  categories?: { id: string; name: string }[];
  tags?: { id: string; name: string }[];
}

export const getServerSideProps: GetServerSideProps<CreatePartyProps> = async ({ req, res }) => {
  const supabase = createUserServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: "/signin", permanent: false } };

  const [categories, tags, me] = await Promise.all([
    getPartyCategories(supabase),
    getTags(supabase),
    getProfile(supabase, user.id),
  ]);

  if (!categories) {
    return { props: { error: true, userId: user.id } };
  }

  return {
    props: {
      error: false,
      userId: user.id,
      me,
      categories,
      tags: tags ?? [],
    },
  };
};

type CostMode = "free" | "paid";
type CrewMode = "limited" | "unlimited";

const MEETING_OTHER = "other";

const MEETING_PRESETS = [
  "On campus",
  "Sam Yan",
  "Siam",
  "Ari",
  "Silom",
  "Sukhumvit",
  "Chatuchak",
  "Phra Nakhon",
];

/** Rough map centers for the meeting presets, used to open the pin map nearby. */
const PRESET_COORDS: Record<string, MapPin> = {
  "On campus": { lat: 13.7345, lng: 100.5303 },
  "Sam Yan": { lat: 13.7266, lng: 100.528 },
  Siam: { lat: 13.7465, lng: 100.5345 },
  Ari: { lat: 13.7773, lng: 100.543 },
  Silom: { lat: 13.7234, lng: 100.532 },
  Sukhumvit: { lat: 13.7367, lng: 100.5603 },
  Chatuchak: { lat: 13.7999, lng: 100.5501 },
  "Phra Nakhon": { lat: 13.754, lng: 100.499 },
};

interface FormState {
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  locationPreset: string;
  location: string;
  pinOnMap: boolean;
  mapPin: MapPin | null;
  costMode: CostMode;
  budget: string;
  crewMode: CrewMode;
  capacity: string;
  requiresApproval: boolean;
  interests: string[];
}

const EMPTY_FORM: FormState = {
  title: "",
  category: "",
  description: "",
  date: "",
  time: "",
  endTime: "",
  locationPreset: "",
  location: "",
  pinOnMap: false,
  mapPin: null,
  costMode: "free",
  budget: "",
  crewMode: "unlimited",
  capacity: "",
  requiresApproval: false,
  interests: [],
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.title.trim().length < 3)
    errors.title = "Give the party a title (at least 3 characters).";
  if (!form.category) errors.category = "Pick a category so people can find it.";
  if (!form.date) errors.date = "Pick a date.";
  if (!form.time) errors.time = "Pick a start time.";
  if (form.date && form.time) {
    const when = new Date(toBangkokIso(form.date, form.time)).getTime();
    if (Number.isNaN(when)) errors.date = "That date/time doesn't look valid.";
    else if (when < Date.now() - 60_000)
      errors.date = "Pick a time in the future — this party should still happen.";
  }
  const location =
    form.locationPreset === MEETING_OTHER ? form.location.trim() : form.locationPreset;
  if (!location) {
    if (!form.locationPreset) errors.locationPreset = "Pick a meeting point.";
    else errors.location = "Describe the meeting point.";
  }
  if (form.endTime) {
    if (form.time && form.date) {
      const start = new Date(toBangkokIso(form.date, form.time)).getTime();
      const end = new Date(toBangkokIso(form.date, form.endTime)).getTime();
      if (!Number.isNaN(end)) {
        if (end <= start) errors.endTime = "The end time must be after the start time.";
      } else {
        errors.endTime = "That end time doesn't look valid.";
      }
    } else {
      errors.endTime = "Pick a start date and time first.";
    }
  }
  if (form.costMode === "paid") {
    const budget = Number(form.budget);
    if (form.budget === "" || !Number.isInteger(budget) || budget < 1)
      errors.budget = "Enter the cost per person (a whole number of ฿1 or more).";
  }
  if (form.crewMode === "limited") {
    const capacity = Number(form.capacity);
    if (form.capacity === "" || !Number.isInteger(capacity) || capacity < 2 || capacity > 20)
      errors.capacity = "Crew size must be a whole number between 2 and 20.";
  }
  return errors;
}

export default function CreatePartyPage({
  error,
  userId = "",
  me = null,
  categories = [],
  tags = [],
}: CreatePartyProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [tagDraft, setTagDraft] = React.useState("");
  const [tagError, setTagError] = React.useState<string | null>(null);
  const [tagSaving, setTagSaving] = React.useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSummaryError(null);
  };

  // Same rules as the profile page chips: lowercase, ≤24 chars, no duplicates.
  // Each add also creates the tag on the server right away, not just locally.
  const addInterest = async (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (tag.length > 24) {
      setTagError("Keep tags under 24 characters.");
      return;
    }
    if (form.interests.some((i) => i.toLowerCase() === tag)) {
      setTagError(`“${tag}” is already selected.`);
      return;
    }
    if (form.interests.length >= 12) {
      setTagError("Up to 12 tags — remove one first.");
      return;
    }
    setTagSaving(true);
    try {
      const supabase = createBrowserClient();
      // tags.name is UNIQUE and case-sensitive — normalize before lookup/insert.
      const tagId = await ensureTagId(supabase, tag);
      if (!tagId) {
        setTagError("Could not add the tag. Try again.");
        return;
      }
      // Functional update — the server roundtrip may overlap with other edits.
      setForm((prev) =>
        prev.interests.some((i) => i.toLowerCase() === tag)
          ? prev
          : { ...prev, interests: [...prev.interests, tag] },
      );
      setTagDraft("");
      setTagError(null);
      setSummaryError(null);
      // Other pages list tags too — flag shared data as mutated so their next
      // load picks the new tag up, without reloading this page.
      markDataMutated();
    } finally {
      setTagSaving(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstError = (Object.keys(nextErrors) as Array<keyof FormErrors>).find(
      (key) => nextErrors[key],
    );
    if (firstError) {
      setSummaryError("Check the highlighted fields — nothing was published yet.");
      document.getElementById(`field-${firstError}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createBrowserClient();

      const categoryId = categories.find((c) => c.name === form.category)?.id;
      const pin = form.pinOnMap && form.mapPin ? form.mapPin : undefined;
      const paid = form.costMode === "paid";

      const basePayload = {
        name: form.title.trim(),
        description: form.description.trim() || null,
        category_id: categoryId ?? null,
        time_start: toBangkokIso(form.date, form.time),
        time_end: form.endTime ? toBangkokIso(form.date, form.endTime) : null,
        location:
          form.locationPreset === MEETING_OTHER ? form.location.trim() : form.locationPreset,
        estimated_cost: paid ? Number(form.budget) : null,
        approval_required: form.requiresApproval,
        max_slots: form.crewMode === "limited" ? Number(form.capacity) : null,
        organiser_id: userId,
      };

      // PostgREST serializes `point` as "(x,y)" with x=lng, y=lat. If the
      // coordinate write is rejected, publish without the pin (non-critical).
      const attempt = async (withPin: boolean) => {
        const payload =
          withPin && pin
            ? { ...basePayload, location_coordinates: formatPointColumn(pin) }
            : basePayload;
        return supabase.from("parties").insert(payload).select("id").single();
      };

      let result = await attempt(true);
      if ((result.error || !result.data) && pin) {
        console.error("[create] pin insert failed, retrying without it:", result.error);
        result = await attempt(false);
      }

      if (result.error || !result.data) {
        setSummaryError("Could not publish the party. Try again.");
        return;
      }
      const partyId: string = result.data.id;

      // The organiser is a participant: own approved row, matching taken_slots.
      const { error: joinError } = await supabase.from("parties_users").insert({
        party_id: partyId,
        user_id: userId,
        status: "approved",
      });
      if (joinError) {
        setSummaryError(
          "The party was published but joining it failed — try again from the party page.",
        );
      }

      // Link selected interest tags by id (best effort — metadata only).
      // Custom typed tags were created server-side on add; re-ensure just in case.
      const presetTagIds = form.interests
        .map((name) => tags.find((tag) => tag.name === name)?.id)
        .filter((id): id is string => id !== undefined);
      const customTagIds = (
        await Promise.all(
          form.interests
            .filter((name) => !tags.some((tag) => tag.name === name))
            .map((name) => ensureTagId(supabase, name)),
        )
      ).filter((id): id is string => id !== undefined);
      const tagIds = [...presetTagIds, ...customTagIds];
      if (tagIds.length > 0) {
        const { error: tagsError } = await supabase
          .from("parties_tags")
          .insert(tagIds.map((tag_id) => ({ party_id: partyId, tag_id })));
        if (tagsError) {
          console.error("[create] parties_tags insert failed:", tagsError);
        }
      }

      try {
        window.sessionStorage.setItem(CREATED_PARTY_FLAG, partyId);
      } catch {
        // storage unavailable — the details page simply skips the toast
      }
      markDataMutated();
      router.push(`/parties/${partyId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedLocation =
    form.locationPreset === MEETING_OTHER ? form.location.trim() : form.locationPreset;

  const customInterests = form.interests.filter((name) => !tags.some((tag) => tag.name === name));

  const mapCenter =
    PRESET_COORDS[
      form.locationPreset === MEETING_OTHER ? inferArea(form.location) : form.locationPreset
    ];

  const previewParty: PartySummary = React.useMemo(
    () => ({
      id: "preview",
      title: form.title.trim() || "Your party title",
      description: form.description.trim(),
      categoryId: categories.find((c) => c.name === form.category)?.id ?? null,
      categoryName: form.category || null,
      timeStart: toBangkokIso(form.date || daysFromToday(1), form.time || "18:00"),
      timeEnd: form.endTime ? toBangkokIso(form.date || daysFromToday(1), form.endTime) : null,
      location: resolvedLocation || "Meeting point",
      budgetPerPerson: form.costMode === "paid" ? Number(form.budget) || null : null,
      approvalRequired: form.requiresApproval,
      takenSlots: 1,
      maxSlots:
        form.crewMode === "limited" && Number.isInteger(Number(form.capacity))
          ? Number(form.capacity)
          : null,
      organiserId: userId,
      tags: form.interests.map((name) => ({
        id: tags.find((tag) => tag.name === name)?.id ?? name,
        name,
      })),
      createdAt: new Date().toISOString(),
      participants: me
        ? [
            {
              id: me.id,
              name: me.name,
              nickname: me.nickname,
              profileUrl: me.profileUrl,
              status: "approved" as const,
              joinedAt: new Date().toISOString(),
            },
          ]
        : [],
    }),
    [form, resolvedLocation, userId, categories, tags, me],
  );

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <Head>
        <title>Start a party · CONNEX</title>
      </Head>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Go back" onClick={() => router.back()}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="text-sm text-muted-foreground">Start a party</span>
        </div>

        <header className="flex flex-col gap-1">
          <h1 className="font-heading heading-1 font-semibold tracking-tight">Start a party</h1>
          <p className="text-sm text-muted-foreground">
            Post what you want to do — the crew finds you.
          </p>
        </header>

        {summaryError ? <ErrorState title={summaryError} /> : null}

        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8"
        >
          <div className="flex min-w-0 flex-col gap-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle>The basics</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 pt-0">
                <Field label="Party title" error={errors.title} id="field-title">
                  <Input
                    id="field-title"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. ตีแบดมินตัน · Badminton session"
                    aria-invalid={!!errors.title}
                    maxLength={80}
                  />
                </Field>

                <Field label="Category" error={errors.category} id="field-category">
                  <Select
                    value={form.category === "" ? null : form.category}
                    onValueChange={(value) => set("category", value ?? "")}
                  >
                    <SelectTrigger
                      id="field-category"
                      className="w-full"
                      aria-invalid={!!errors.category}
                    >
                      <SelectValue>{form.category || "Select a category"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Description"
                  error={undefined}
                  id="field-description"
                  hint="Optional, but a sentence helps people decide."
                >
                  <Textarea
                    id="field-description"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="What's the party about? Skill level, what to bring, สำหรับมือใหม่ก็มาได้…"
                    rows={4}
                    maxLength={500}
                    className="h-32"
                  />
                </Field>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Time & place</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-5 pt-0">
                <Field label="Date" error={errors.date} id="field-date" className="col-span-2">
                  <Input
                    id="field-date"
                    type="date"
                    min={daysFromToday(0)}
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    aria-invalid={!!errors.date}
                  />
                </Field>
                <Field label="Start time" error={errors.time} id="field-time">
                  <Input
                    id="field-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                    aria-invalid={!!errors.time}
                  />
                </Field>
                <Field label="End time (optional)" error={errors.endTime} id="field-endTime">
                  <Input
                    id="field-endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => set("endTime", e.target.value)}
                    aria-invalid={!!errors.endTime}
                  />
                </Field>
                <Field
                  label="Meeting point"
                  error={errors.locationPreset}
                  id="field-locationPreset"
                  className="col-span-2"
                >
                  <Select
                    value={form.locationPreset === "" ? null : form.locationPreset}
                    onValueChange={(value) => {
                      set("locationPreset", value ?? "");
                      if (value !== MEETING_OTHER) set("location", "");
                    }}
                  >
                    <SelectTrigger
                      id="field-locationPreset"
                      className="w-full"
                      aria-invalid={!!errors.locationPreset}
                    >
                      <SelectValue>
                        {form.locationPreset === MEETING_OTHER
                          ? "Other — describe below"
                          : form.locationPreset || "Pick a meeting point"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_PRESETS.map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {preset}
                        </SelectItem>
                      ))}
                      <SelectItem value={MEETING_OTHER}>Other (type below)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {form.locationPreset === MEETING_OTHER ? (
                  <Field
                    label="Describe the meeting point"
                    error={errors.location}
                    id="field-location"
                    className="col-span-2"
                    hint="The approximate area is picked up from this automatically."
                  >
                    <Input
                      id="field-location"
                      value={form.location}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder="e.g. CU Sport Complex, Court 3"
                      aria-invalid={!!errors.location}
                      maxLength={120}
                    />
                  </Field>
                ) : null}
                <div className="col-span-2 flex flex-col gap-2">
                  <Label htmlFor="field-pinOnMap" className="cursor-pointer">
                    <Checkbox
                      id="field-pinOnMap"
                      checked={form.pinOnMap}
                      onCheckedChange={(checked) => {
                        set("pinOnMap", checked);
                        if (!checked) set("mapPin", null);
                      }}
                    />
                    Pinpoint the exact spot on a map (optional)
                  </Label>
                  {form.pinOnMap ? (
                    <MapPinPicker
                      value={form.mapPin}
                      onChange={(pin) => set("mapPin", pin)}
                      center={mapCenter}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Opens a small map you can drag until the center pin sits on the exact spot —
                      otherwise the crew just sees the meeting point above.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Cost, crew & joining</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 pt-0">
                <div className="flex flex-col gap-2">
                  <Label id="label-cost">Cost per person</Label>
                  <SegmentedControl<CostMode>
                    label="Cost per person"
                    value={form.costMode}
                    onChange={(value) => {
                      set("costMode", value);
                      if (value === "free") setForm((prev) => ({ ...prev, budget: "" }));
                    }}
                    options={[
                      { value: "free", label: "Free" },
                      { value: "paid", label: "Costs money" },
                    ]}
                  />
                  {form.costMode === "paid" ? (
                    <Field label="Est. cost per person (฿)" error={errors.budget} id="field-budget">
                      <Input
                        id="field-budget"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={form.budget}
                        onChange={(e) => set("budget", e.target.value)}
                        placeholder="e.g. 250"
                        aria-invalid={!!errors.budget}
                      />
                    </Field>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Shown as “Free” on the activity card.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label id="label-crew">Crew size</Label>
                  <SegmentedControl<CrewMode>
                    label="Crew size"
                    value={form.crewMode}
                    onChange={(value) => {
                      set("crewMode", value);
                      if (value === "unlimited") setForm((prev) => ({ ...prev, capacity: "" }));
                    }}
                    options={[
                      { value: "limited", label: "Limited" },
                      { value: "unlimited", label: "Unlimited" },
                    ]}
                  />
                  {form.crewMode === "limited" ? (
                    <Field label="Max crew, incl. you" error={errors.capacity} id="field-capacity">
                      <Input
                        id="field-capacity"
                        type="number"
                        inputMode="numeric"
                        min={2}
                        max={20}
                        step={1}
                        value={form.capacity}
                        onChange={(e) => set("capacity", e.target.value)}
                        placeholder="e.g. 4"
                        aria-invalid={!!errors.capacity}
                      />
                    </Field>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Anyone can join — no cap on participants.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label id="label-approval">Joining</Label>
                  <SegmentedControl<"approval" | "instant">
                    label="How joining works"
                    value={form.requiresApproval ? "approval" : "instant"}
                    onChange={(value) => set("requiresApproval", value === "approval")}
                    options={[
                      { value: "approval", label: "I approve requests" },
                      { value: "instant", label: "Instant join" },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.requiresApproval
                      ? "You review each join request and confirm spots yourself."
                      : "Anyone can join right away without your approval."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Interests</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pt-0">
                <p className="text-sm text-muted-foreground">
                  Help people find this party through matching — pick what fits, or add your own.
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Interests">
                  {[...tags, ...customInterests.map((name) => ({ id: name, name }))].map((tag) => {
                    const active = form.interests.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          set(
                            "interests",
                            active
                              ? form.interests.filter((i) => i !== tag.name)
                              : [...form.interests, tag.name],
                          )
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          active
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <label htmlFor="field-customTag" className="sr-only">
                    Add an interest
                  </label>
                  <Input
                    id="field-customTag"
                    value={tagDraft}
                    onChange={(event) => {
                      setTagDraft(event.target.value);
                      setTagError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addInterest(tagDraft);
                      }
                    }}
                    placeholder="Add a tag…"
                    maxLength={24}
                    autoComplete="off"
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={tagSaving}
                    onClick={() => void addInterest(tagDraft)}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Add
                  </Button>
                </div>
                {tagError ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {tagError}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:sticky lg:top-6 lg:block lg:min-w-0">
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 font-heading heading-6 font-semibold">
                <Eye aria-hidden="true" className="size-4" />
                Live preview
              </p>
              <p className="text-xs text-muted-foreground">
                How your card appears to other students — it updates as you fill the form. This
                preview isn’t clickable.
              </p>
              <PartyCard party={previewParty} getMyStatus={() => "creator"} nonInteractive />
              <Badge variant="outline" className="self-start">
                {form.requiresApproval ? "Host approves requests" : "Instant join"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:col-span-2">
            <Button type="submit" size="lg" disabled={submitting}>
              <CalendarPlus data-icon="inline-start" aria-hidden="true" />
              {submitting ? "Publishing…" : "Create Party"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

/** Find or create a tag by its normalized name; null if it can't be ensured. */
async function ensureTagId(
  supabase: SupabaseClient<Database>,
  name: string,
): Promise<string | null> {
  const existing = await supabase.from("tags").select("id").eq("name", name).maybeSingle();
  let tagId = existing.data?.id;
  if (!tagId) {
    const inserted = await supabase.from("tags").insert({ name }).select("id").single();
    if (inserted.error) {
      // Lost an insert race — the tag exists now; re-read it.
      const again = await supabase.from("tags").select("id").eq("name", name).maybeSingle();
      tagId = again.data?.id;
    } else {
      tagId = inserted.data.id;
    }
  }
  return tagId ?? null;
}

function Field({
  label,
  error,
  id,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  id: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-lg bg-muted p-[3px] outline-none focus-within:ring-3 focus-within:ring-ring/50"
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
