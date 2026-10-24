import * as React from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  DAY_OPTIONS,
  FilterSheet,
  type ManualFilters,
  TIME_OPTIONS,
} from "@/components/filter-sheet";
import { PartyCard } from "@/components/party-card";
import { DiscoverEmptyState, EmptyState, ErrorState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type InterpretationChip,
  applyFilters,
  chipLabelFor,
  filtersFromChips,
  interpretQuery,
  rankMatches,
  sortParties,
} from "@/lib/ai/interpret";
import { consumeDataMutated } from "@/lib/data-version";
import type { SortOption } from "@/lib/filters";
import { formatBudget } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import { getParties } from "@/lib/supabase/queries/get-parties";
import { getPartyCategories } from "@/lib/supabase/queries/get-party-categories";
import { getProfile } from "@/lib/supabase/queries/get-profile";
import { type SearchFilters, searchParties } from "@/lib/supabase/queries/search-parties";
import type { PartySummary, ProfileSummary } from "@/lib/supabase/queries/types";
import { createUserServerClient } from "@/lib/supabase/server";
import { cn } from "cn";
import { Info, RotateCcw, Search, Sparkles, X } from "lucide-react";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "soonest", label: "Soonest first" },
  { value: "popularity", label: "Most popular" },
];

const SUGGESTED_PROMPTS = [
  "ตีแบดพรุ่งนี้เย็น under 200",
  "Korean food around Ari for 4 people",
  "movie this week under 250",
  "gaming night this week under 300",
  "run tomorrow evening, free",
];

export interface SearchProps {
  error: boolean;
  userId?: string;
  parties?: PartySummary[];
  hasMore?: boolean;
  me?: ProfileSummary | null;
  categories?: string[];
}

export const getServerSideProps: GetServerSideProps<SearchProps> = async ({ req, res }) => {
  const supabase = createUserServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: "/signin", permanent: false } };

  const [parties, me, categories] = await Promise.all([
    searchParties(supabase, {}, user.id, { limit: 20, offset: 0 }),
    getProfile(supabase, user.id),
    getPartyCategories(supabase),
  ]);

  if (!parties) {
    return { props: { error: true, userId: user.id } };
  }

  return {
    props: {
      error: false,
      userId: user.id,
      parties: parties.parties,
      hasMore: parties.hasMore,
      me,
      categories: (categories ?? []).map((category) => category.name),
    },
  };
};

export default function SearchPage({
  error,
  userId = "",
  parties = [],
  hasMore: initialHasMore = true,
  me = null,
  categories = [],
}: SearchProps) {
  const router = useRouter();
  const now = React.useMemo(() => new Date().getTime(), []);

  // Back/forward navigation restores cached props — refetch once when another
  // page mutated data recently so results and counts stay truthful.
  React.useEffect(() => {
    if (consumeDataMutated()) void router.replace(router.asPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: consume the staleness flag once per mount
  }, []);

  const CYCLE_OPTIONS: Record<string, string[] | undefined> = {
    category: categories,
    dayWithin: DAY_OPTIONS.map((o) => o.value),
    timeOfDay: TIME_OPTIONS.map((o) => o.value),
    budgetMax: ["0", "100", "200", "300", "500"],
  };

  const [mode, setMode] = React.useState<"all" | "ai">("all");
  const initialized = React.useRef(false);

  // Mode "All" state
  const [text, setText] = React.useState("");
  const [filters, setFilters] = React.useState<ManualFilters>({});
  const [sort, setSort] = React.useState<SortOption>("relevance");
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const [results, setResults] = React.useState<PartySummary[]>(parties);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [nextOffset, setNextOffset] = React.useState(parties.length);
  const [textOrder, setTextOrder] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = React.useRef(false);
  const requestGenerationRef = React.useRef(0);

  const manualKeywordList = React.useMemo(
    () =>
      text
        .toLowerCase()
        .split(" ")
        .map((w) => w.trim())
        .filter(Boolean),
    [text],
  );

  const toSearchFilters = React.useCallback(
    (manual: ManualFilters, searchText: string): SearchFilters => ({
      category: manual.category,
      dayWithin: manual.dayWithin,
      timeOfDay: manual.timeOfDay,
      budgetMax: manual.budgetMax,
      minSpots: manual.minSpots,
      area: manual.area,
      text: searchText.trim() || undefined,
    }),
    [],
  );

  const isInitialFilters = React.useRef(true);

  const fetchPage = React.useCallback(
    (offset: number, isAppend: boolean) => {
      void (async () => {
        const generation = ++requestGenerationRef.current;
        if (isAppend) {
          if (isLoadingMoreRef.current) return;
          isLoadingMoreRef.current = true;
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setFetchError(null);

        const supabase = createBrowserClient();
        const result = await searchParties(supabase, toSearchFilters(filters, text), userId, {
          limit: 20,
          offset,
        });

        if (isAppend) {
          isLoadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          setLoading(false);
        }

        if (!result) {
          if (generation === requestGenerationRef.current) {
            setFetchError("Something went wrong. Please try again.");
          }
          return;
        }

        // A newer query superseded this one (e.g. user kept typing); drop the
        // stale response instead of interleaving pages from different queries.
        if (generation !== requestGenerationRef.current) return;

        setResults((prev) => (isAppend ? [...prev, ...result.parties] : result.parties));
        setTextOrder(result.textOrder ?? []);
        setHasMore(result.hasMore);
        setNextOffset(result.nextOffset);
      })();
    },
    [userId, toSearchFilters, filters, text],
  );

  React.useEffect(() => {
    if (isInitialFilters.current && !text && Object.keys(filters).length === 0) {
      isInitialFilters.current = false;
      return;
    }
    isInitialFilters.current = false;

    const timer = window.setTimeout(() => {
      void fetchPage(0, false);
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-query on text/filter/sort changes
  }, [text, filters, sort]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMoreRef.current && !loading) {
          void fetchPage(nextOffset, true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextOffset, hasMore, loading, fetchPage]);

  // Mode "AI" state
  const [aiQuery, setAiQuery] = React.useState("");
  const [chips, setChips] = React.useState<InterpretationChip[]>([]);
  const [aiNotes, setAiNotes] = React.useState<string[]>([]);
  const [aiProcessing, setAiProcessing] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiSubmitted, setAiSubmitted] = React.useState<string | null>(null);
  const processingTimer = React.useRef<number | null>(null);
  const chipsRef = React.useRef<InterpretationChip[]>([]);
  React.useEffect(() => {
    chipsRef.current = chips;
  }, [chips]);

  React.useEffect(() => {
    if (!router.isReady || initialized.current) return;
    initialized.current = true;
    // One-time init from the URL a link provided (e.g. /search?mode=ai&category=Food).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (router.query.mode === "ai") setMode("ai");
    const category = router.query.category;
    if (typeof category === "string") {
      const names = category.split(",").filter((name) => categories.includes(name));
      if (names.length > 0) {
        setFilters((prev) => ({ ...prev, category: names }));
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router.isReady, router.query.mode, router.query.category, categories]);

  React.useEffect(() => {
    return () => {
      if (processingTimer.current) window.clearTimeout(processingTimer.current);
    };
  }, []);

  /* ------------------------------ mode "All" ------------------------------ */

  // Popularity reorders loaded pages client-side; relevance uses the RPC's
  // trigram-similarity order when a text search ran, falling back to the
  // DB's soonest-first order otherwise.
  const displayResults = React.useMemo(() => {
    if (sort === "popularity") return sortParties(results, "popularity");
    if (sort === "relevance" && textOrder.length > 0) {
      const rank = new Map(textOrder.map((id, index) => [id, index]));
      return [...results].sort(
        (a, b) =>
          (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
    }
    return results;
  }, [results, sort, textOrder]);

  const activeFilterCount =
    (filters.category?.length ?? 0) +
    (filters.dayWithin?.length ?? 0) +
    (filters.timeOfDay?.length ?? 0) +
    (filters.area?.length ?? 0) +
    (filters.budgetMax !== undefined ? 1 : 0) +
    (filters.minSpots !== undefined ? 1 : 0);
  const hasManualQuery = manualKeywordList.length > 0 || activeFilterCount > 0;
  const activeSheetFilterCount =
    (filters.dayWithin?.length ?? 0) +
    (filters.timeOfDay?.length ?? 0) +
    (filters.area?.length ?? 0) +
    (filters.budgetMax !== undefined ? 1 : 0) +
    (filters.minSpots !== undefined ? 1 : 0);
  const hasSheetFilterBadges = activeSheetFilterCount > 0 || manualKeywordList.length > 0;

  const removeFilterValue = (field: "dayWithin" | "timeOfDay" | "area", value: string) => {
    setFilters((f) => {
      const next = (f[field] ?? []).filter((v) => v !== value);
      return { ...f, [field]: next.length > 0 ? next : undefined } as ManualFilters;
    });
  };

  const relaxActions: Array<{ label: string; clear: () => void }> = [];
  if (filters.budgetMax !== undefined)
    relaxActions.push({
      label: "Any budget",
      clear: () => setFilters((f) => ({ ...f, budgetMax: undefined })),
    });
  if (filters.dayWithin?.length)
    relaxActions.push({
      label: "Any date",
      clear: () => setFilters((f) => ({ ...f, dayWithin: undefined })),
    });
  if (filters.minSpots !== undefined)
    relaxActions.push({
      label: "Any group size",
      clear: () => setFilters((f) => ({ ...f, minSpots: undefined })),
    });
  if (filters.timeOfDay?.length)
    relaxActions.push({
      label: "Any time",
      clear: () => setFilters((f) => ({ ...f, timeOfDay: undefined })),
    });
  if (filters.area?.length)
    relaxActions.push({
      label: "Any area",
      clear: () => setFilters((f) => ({ ...f, area: undefined })),
    });
  if (filters.category?.length)
    relaxActions.push({
      label: "All categories",
      clear: () => setFilters((f) => ({ ...f, category: undefined })),
    });
  if (manualKeywordList.length > 0)
    relaxActions.push({ label: "Clear search text", clear: () => setText("") });

  const resetManual = () => {
    setFilters({});
    setText("");
    setSort("relevance");
  };

  /* ------------------------------ mode "AI" ------------------------------- */

  const runInterpretation = (rawQuery: string, isRefinement: boolean) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      setAiError("Type what you feel like doing — the prototype needs a sentence to interpret.");
      return;
    }
    setAiError(null);
    setAiProcessing(true);
    setAiSubmitted(trimmed);
    if (processingTimer.current) window.clearTimeout(processingTimer.current);
    processingTimer.current = window.setTimeout(() => {
      const interpretation = interpretQuery(trimmed);
      const prevChips = chipsRef.current;
      if (!isRefinement || prevChips.length === 0) {
        setChips(interpretation.chips);
        setAiNotes(interpretation.notes);
      } else {
        const detectedFields = new Set(interpretation.chips.map((c) => c.field));
        const kept = prevChips.filter(
          (chip) =>
            !detectedFields.has(chip.field) &&
            !(chip.field === "keyword" && interpretation.chips.some((c) => c.field === "keyword")),
        );
        const merged = [...kept, ...interpretation.chips];
        setChips(merged);
        setAiNotes([
          ...interpretation.notes,
          `Refined on top of ${kept.length} kept chip${kept.length === 1 ? "" : "s"} from your earlier request.`,
        ]);
      }
      setAiProcessing(false);
    }, 900);
  };

  const removeChip = (chipId: string) =>
    setChips((prev) => prev.filter((chip) => chip.id !== chipId));

  const cycleChip = (chip: InterpretationChip) => {
    setChips((prev) =>
      prev.map((c) => {
        if (c.id !== chip.id) return c;
        const options = CYCLE_OPTIONS[chip.field];
        if (!options) return c;
        const index = options.indexOf(c.value);
        const next = options[(index + 1) % options.length];
        return { ...c, value: next, label: chipLabelFor(chip.field, next) };
      }),
    );
  };

  const aiFilters = React.useMemo(() => filtersFromChips(chips), [chips]);
  const [aiParties, setAiParties] = React.useState<PartySummary[] | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const aiFetched = React.useRef(false);

  React.useEffect(() => {
    if (mode !== "ai" || aiFetched.current) return;
    aiFetched.current = true;
    setAiLoading(true);
    const supabase = createBrowserClient();
    void getParties(supabase).then((parties) => {
      if (parties) {
        setAiParties(parties);
      } else {
        aiFetched.current = false;
      }
      setAiLoading(false);
    });
  }, [mode]);

  const aiResults = React.useMemo(() => {
    const filtered = applyFilters(aiParties ?? [], aiFilters, userId, now);
    return rankMatches(filtered, aiFilters, me ?? undefined, now);
  }, [aiParties, aiFilters, userId, me, now]);

  const aiRelaxActions: Array<{ label: string; onClick: () => void }> = [];
  for (const chip of chips) {
    if (chip.field === "keyword") continue;
    aiRelaxActions.push({ label: `Remove “${chip.label}”`, onClick: () => removeChip(chip.id) });
  }

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <Head>
        <title>Search · CONNEX</title>
      </Head>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading heading-1 font-semibold tracking-tight">
            Find something to do
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse everything, or describe your party in your own words.
          </p>
        </header>

        <Tabs value={mode} onValueChange={(value) => setMode(value === "ai" ? "ai" : "all")}>
          <TabsList className="w-full" aria-label="Search mode">
            <TabsTrigger value="all">All activities</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkles aria-hidden="true" className="size-3.5" />
              AI search
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------ MODE: ALL ------------------------------ */}
          <TabsContent value="all">
            <div className="flex flex-col gap-3 pt-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Search title, place, vibe…"
                    aria-label="Search activities"
                    className="pl-8"
                  />
                </div>
                <FilterSheet
                  open={filterSheetOpen}
                  onOpenChange={setFilterSheetOpen}
                  filters={filters}
                  categories={categories}
                  onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
                  onReset={resetManual}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div aria-live="polite" className="text-sm text-muted-foreground">
                  {hasMore
                    ? `Showing ${results.length}+ activities`
                    : `${results.length} ${results.length === 1 ? "activity" : "activities"}`}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sort-select" className="text-xs text-muted-foreground">
                    Sort
                  </Label>
                  <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
                    <SelectTrigger id="sort-select" size="sm" aria-label="Sort results">
                      <SelectValue>{SORT_OPTIONS.find((o) => o.value === sort)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div
                  className="flex items-center gap-2 overflow-x-auto pb-1"
                  role="group"
                  aria-label="Quick category filters"
                >
                  <Button
                    variant={filters.category?.length ? "outline" : "default"}
                    size="sm"
                    onClick={() => setFilters((f) => ({ ...f, category: undefined }))}
                    disabled={!filters.category?.length}
                  >
                    All
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={filters.category?.includes(category) ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setFilters((f) => {
                          const current = f.category ?? [];
                          const next = current.includes(category)
                            ? current.filter((value) => value !== category)
                            : [...current, category];
                          return { ...f, category: next.length > 0 ? next : undefined };
                        })
                      }
                      className="shrink-0"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                {hasSheetFilterBadges ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(filters.dayWithin ?? []).map((value) => (
                      <FilterChip
                        key={`dayWithin-${value}`}
                        label={DAY_OPTIONS.find((o) => o.value === value)?.label ?? value}
                        onRemove={() => removeFilterValue("dayWithin", value)}
                      />
                    ))}
                    {(filters.timeOfDay ?? []).map((value) => (
                      <FilterChip
                        key={`timeOfDay-${value}`}
                        label={TIME_OPTIONS.find((o) => o.value === value)?.label ?? value}
                        onRemove={() => removeFilterValue("timeOfDay", value)}
                      />
                    ))}
                    {filters.budgetMax !== undefined ? (
                      <FilterChip
                        label={
                          filters.budgetMax === 0 ? "Free" : `≤ ${formatBudget(filters.budgetMax)}`
                        }
                        onRemove={() => setFilters((f) => ({ ...f, budgetMax: undefined }))}
                      />
                    ) : null}
                    {(filters.area ?? []).map((value) => (
                      <FilterChip
                        key={`area-${value}`}
                        label={value}
                        onRemove={() => removeFilterValue("area", value)}
                      />
                    ))}
                    {filters.minSpots !== undefined ? (
                      <FilterChip
                        label={`Room for ${filters.minSpots}+`}
                        onRemove={() => setFilters((f) => ({ ...f, minSpots: undefined }))}
                      />
                    ) : null}
                    {manualKeywordList.length > 0 ? (
                      <FilterChip label={`“${text.trim()}”`} onRemove={() => setText("")} />
                    ) : null}
                  </div>
                ) : null}
              </div>

              {fetchError ? (
                <ErrorState onRetry={() => void fetchPage(0, false)} body={fetchError} />
              ) : results.length > 0 ? (
                <>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {displayResults.map((party) => (
                      <li key={party.id}>
                        <PartyCard party={party} className="h-full" />
                      </li>
                    ))}
                  </ul>
                  {hasMore ? (
                    <div ref={sentinelRef} aria-hidden="true" className="h-1" />
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      You&apos;ve reached the end
                    </p>
                  )}
                  {loadingMore ? (
                    <div role="status" className="flex justify-center py-4">
                      <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    </div>
                  ) : null}
                </>
              ) : loading ? (
                <div role="status" className="flex justify-center py-8">
                  <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              ) : (
                <DiscoverEmptyState
                  onReset={hasManualQuery ? resetManual : undefined}
                  relaxActions={relaxActions}
                />
              )}
            </div>
          </TabsContent>

          {/* ------------------------------ MODE: AI ------------------------------ */}
          <TabsContent value="ai">
            <div className="flex flex-col gap-3 pt-3">
              <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                Interpretation is simulated by rules in your browser — no AI service is called yet,
                and results come from real activity data.
              </p>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  runInterpretation(aiQuery, chips.length > 0 || aiSubmitted !== null);
                }}
                className="flex flex-col gap-2"
              >
                <label htmlFor="ai-query" className="sr-only">
                  Describe what you want to do
                </label>
                <Input
                  id="ai-query"
                  value={aiQuery}
                  onChange={(event) => setAiQuery(event.target.value)}
                  placeholder="e.g. ตีแบดพรุ่งนี้เย็น งบไม่เกิน 200"
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={aiProcessing} className="flex-1">
                    <Sparkles data-icon="inline-start" aria-hidden="true" />
                    {aiProcessing
                      ? "Interpreting…"
                      : chips.length > 0
                        ? "Refine search"
                        : "Interpret my request"}
                  </Button>
                  {chips.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setChips([]);
                        setAiNotes([]);
                        setAiSubmitted(null);
                        setAiQuery("");
                      }}
                    >
                      <RotateCcw data-icon="inline-start" aria-hidden="true" />
                      Clear
                    </Button>
                  ) : null}
                </div>
              </form>

              {aiError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {aiError}
                </p>
              ) : null}

              {aiSubmitted === null && chips.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Try one of these:</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <li key={prompt}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAiQuery(prompt);
                            runInterpretation(prompt, false);
                          }}
                          className="h-auto py-1.5 text-left whitespace-normal"
                        >
                          {prompt}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {aiLoading ? (
                <div role="status" className="flex justify-center py-8">
                  <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              ) : aiProcessing ? (
                <div
                  role="status"
                  aria-label="Interpreting your request"
                  className="flex flex-col gap-3"
                >
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles aria-hidden="true" className="size-4 animate-pulse text-primary" />
                    Reading your request… (simulated, prototype)
                  </p>
                </div>
              ) : chips.length > 0 ? (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        Interpreted as
                        <span className="sr-only"> — tap a chip to change it, ✕ to remove</span>:
                      </p>
                    </div>
                    <ul className="flex flex-wrap gap-1.5" aria-label="Interpretation chips">
                      {chips.map((chip) => (
                        <li key={chip.id} className="flex">
                          <span
                            className={cn(
                              "flex items-center rounded-l-full border border-r-0 border-border bg-background pl-1",
                              CYCLE_OPTIONS[chip.field] ? "pr-0" : "pr-2.5",
                            )}
                          >
                            {CYCLE_OPTIONS[chip.field] ? (
                              <button
                                type="button"
                                onClick={() => cycleChip(chip)}
                                title="Tap to change"
                                aria-label={`${chip.label} — tap to change value`}
                                className="rounded-l-full px-2 py-1 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                              >
                                {chip.label}
                              </button>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium">{chip.label}</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeChip(chip.id)}
                            aria-label={`Remove filter ${chip.label}`}
                            className="flex items-center rounded-r-full border border-border bg-background pr-2 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <X aria-hidden="true" className="size-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {aiNotes.length > 0 ? (
                    <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {aiNotes.map((note, index) => (
                        <li key={index} className="flex items-start gap-1.5">
                          <Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div aria-live="polite" className="text-sm text-muted-foreground">
                    {aiResults.length} {aiResults.length === 1 ? "match" : "matches"}
                  </div>

                  {aiResults.length > 0 ? (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {aiResults.map(({ party, reasons }) => (
                        <li key={party.id}>
                          <PartyCard
                            party={party}
                            aiReason={
                              reasons.length > 0
                                ? `${reasons[0]}${reasons[1] ? ` · ${reasons[1]}` : ""}`
                                : undefined
                            }
                            className="h-full"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      icon={<Sparkles className="size-8" strokeWidth={1.5} />}
                      title="No matches for this interpretation"
                      body="Loosen a chip below, or draft your own party instead — nothing was quietly relaxed."
                      actions={
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {aiRelaxActions.map((action) => (
                              <Button
                                key={action.label}
                                variant="outline"
                                size="sm"
                                onClick={action.onClick}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                          <Button render={<Link href="/create" />}>Draft a party</Button>
                        </div>
                      }
                    />
                  )}
                </>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="outline" className="gap-1 pr-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-full p-0.5 transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </Badge>
  );
}
