import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { ArrowLeft, CalendarPlus, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, SuccessBanner } from "@/components/state-views";
import { useApp } from "@/lib/data/store";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/data/types";
import { cn } from "cn";
import { combineDateTime } from "@/lib/format";

const AREAS = [
  "On campus",
  "Sam Yan",
  "Siam",
  "Ari",
  "Silom",
  "Sukhumvit",
  "Chatuchak",
  "Phra Nakhon",
  "Elsewhere",
];

const INTEREST_OPTIONS = [
  "badminton",
  "football",
  "running",
  "muay thai",
  "volleyball",
  "thai street food",
  "korean food",
  "bubble tea",
  "dessert",
  "coffee",
  "valorant",
  "board games",
  "coding",
  "exam prep",
  "k-pop",
  "karaoke",
  "movies",
  "photography",
  "hiking",
  "language exchange",
];

type CostMode = "free" | "paid";
type CrewMode = "limited" | "unlimited";

interface FormState {
  title: string;
  category: Category | "";
  description: string;
  date: string;
  time: string;
  location: string;
  area: string;
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
  location: "",
  area: "",
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
  if (form.title.trim().length < 3) errors.title = "Give the plan a title (at least 3 characters).";
  if (!form.category) errors.category = "Pick a category so people can find it.";
  if (!form.date) errors.date = "Pick a date.";
  if (!form.time) errors.time = "Pick a start time.";
  if (form.date && form.time) {
    const when = combineDateTime(form.date, form.time);
    if (Number.isNaN(when.getTime())) errors.date = "That date/time doesn't look valid.";
    else if (when.getTime() < Date.now() - 60_000)
      errors.date = "Pick a time in the future — this plan should still happen.";
  }
  if (!form.location.trim()) errors.location = "Where should the crew meet?";
  if (!form.area) errors.area = "Pick an approximate area.";
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

function todayValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CreatePartyPage() {
  const router = useRouter();
  const { createParty, hydrated } = useApp();
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [createdId, setCreatedId] = React.useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSummaryError(null);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstError = (Object.keys(nextErrors) as Array<keyof FormErrors>).find(
      (key) => nextErrors[key]
    );
    if (firstError) {
      setSummaryError("Check the highlighted fields — nothing was published yet.");
      document.getElementById(`field-${firstError}`)?.focus();
      return;
    }
    const party = createParty({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category as Category,
      date: form.date,
      time: form.time,
      location: form.location.trim(),
      area: form.area,
      budgetPerPerson: form.costMode === "free" ? 0 : Number(form.budget),
      capacity: form.crewMode === "unlimited" ? null : Number(form.capacity),
      requiresApproval: form.requiresApproval,
      interests: form.interests,
    });
    setCreatedId(party.id);
  };

  if (createdId) {
    return (
      <div className="flex flex-col gap-5">
        <Head>
          <title>Plan published · CONNEX</title>
        </Head>
        <SuccessBanner
          title="Your plan is live"
          body="It now shows up in Discover, Search and My Activities. In a few seconds a mock student may join so you can try the host flow (prototype)."
        />
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href={`/parties/${createdId}`} />}>
            <Check data-icon="inline-start" aria-hidden="true" />
            View your plan
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setForm(EMPTY_FORM);
              setErrors({});
              setCreatedId(null);
            }}
          >
            Create another
          </Button>
          <Button variant="ghost" render={<Link href="/my" />}>
            Go to My Activities
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Start a plan · CONNEX</title>
      </Head>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Go back" onClick={() => router.back()}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="text-sm text-muted-foreground">Start a plan</span>
        </div>

        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Start a plan</h1>
          <p className="text-sm text-muted-foreground">
            Post what you want to do — the crew finds you.
          </p>
        </header>

        {summaryError ? <ErrorState title={summaryError} /> : null}

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <div className="flex flex-col gap-6 lg:min-w-0">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>The basics</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5 pt-0">
                  <Field label="Plan title" error={errors.title} id="field-title">
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
                      onValueChange={(value) => set("category", value as Category)}
                    >
                      <SelectTrigger
                        id="field-category"
                        className="w-full"
                        aria-invalid={!!errors.category}
                      >
                        <SelectValue>
                          {form.category ? CATEGORY_LABELS[form.category] : "Select a category"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {CATEGORY_LABELS[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Description" error={undefined} id="field-description" hint="Optional, but a sentence helps people decide.">
                    <Textarea
                      id="field-description"
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="What's the plan? Skill level, what to bring, สำหรับมือใหม่ก็มาได้…"
                      rows={4}
                      maxLength={500}
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>Time & place</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-5 pt-0">
                  <Field label="Date" error={errors.date} id="field-date">
                    <Input
                      id="field-date"
                      type="date"
                      min={hydrated ? todayValue() : undefined}
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
                  <Field label="Meeting point" error={errors.location} id="field-location" className="col-span-2">
                    <Input
                      id="field-location"
                      value={form.location}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder="e.g. CU Sport Complex, Court 3"
                      aria-invalid={!!errors.location}
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Approximate area" error={errors.area} id="field-area" className="col-span-2">
                    <Select
                      value={form.area === "" ? null : form.area}
                      onValueChange={(value) => set("area", value as string)}
                    >
                      <SelectTrigger id="field-area" className="w-full" aria-invalid={!!errors.area}>
                        <SelectValue>{form.area || "Select an area"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {AREAS.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-6 lg:min-w-0">
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
                  Help people find this plan through matching — pick what fits.
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Interests">
                  {INTEREST_OPTIONS.map((interest) => {
                    const active = form.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          set(
                            "interests",
                            active
                              ? form.interests.filter((i) => i !== interest)
                              : [...form.interests, interest]
                          )
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                          active
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" size="lg">
              <CalendarPlus data-icon="inline-start" aria-hidden="true" />
              Publish plan
            </Button>
            <p className="text-xs text-muted-foreground">
              Prototype only — the plan is stored in this browser, not on any server.
            </p>
          </div>
        </form>
      </div>
    </>
  );
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
              "flex-1 rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
