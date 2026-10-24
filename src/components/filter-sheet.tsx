import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DayWithin, PartyFilters, TimeOfDay } from "@/lib/filters";
import { formatBudget } from "@/lib/format";
import { cn } from "cn";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

export type ManualFilters = PartyFilters;

const DAY_OPTIONS: Array<{ value: DayWithin; label: string }> = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This weekend" },
  { value: "this_week", label: "Next 7 days" },
];

const TIME_OPTIONS: Array<{ value: TimeOfDay; label: string }> = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening & night" },
];

const BUDGET_OPTIONS = [100, 200, 300, 500];

const AREA_OPTIONS = [
  "On campus",
  "Sam Yan",
  "Siam",
  "Ari",
  "Silom",
  "Sukhumvit",
  "Chatuchak",
  "Phra Nakhon",
];

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  categories,
  onChange,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ManualFilters;
  /** DB category names the filter select offers. */
  categories: string[];
  onChange: (patch: Partial<ManualFilters>) => void;
  onReset: () => void;
}) {
  const activeCount =
    (filters.category?.length ?? 0) +
    (filters.dayWithin?.length ?? 0) +
    (filters.timeOfDay?.length ?? 0) +
    (filters.area?.length ?? 0) +
    (filters.budgetMax !== undefined ? 1 : 0) +
    (filters.minSpots !== undefined ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button variant="outline" className="relative">
            <SlidersHorizontal aria-hidden="true" />
            Filters
            {activeCount > 0 ? (
              <Badge className="ml-0.5 h-4 min-w-4 px-1">{activeCount}</Badge>
            ) : null}
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Results below update live as you change filters.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-2">
          <FilterChips
            label="Category"
            options={categories.map((name) => ({ value: name, label: name }))}
            selected={filters.category ?? []}
            onChange={(next) => onChange({ category: next.length > 0 ? next : undefined })}
          />

          <FilterChips
            label="When"
            options={DAY_OPTIONS}
            selected={filters.dayWithin ?? []}
            onChange={(next) => onChange({ dayWithin: next.length > 0 ? next : undefined })}
          />

          <FilterChips
            label="Time of day"
            options={TIME_OPTIONS}
            selected={filters.timeOfDay ?? []}
            onChange={(next) => onChange({ timeOfDay: next.length > 0 ? next : undefined })}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-budget">Budget per person</Label>
            <Select
              value={filters.budgetMax !== undefined ? String(filters.budgetMax) : null}
              onValueChange={(value) =>
                onChange({ budgetMax: value === null ? undefined : Number(value) })
              }
            >
              <SelectTrigger id="filter-budget" className="w-full">
                <SelectValue>
                  {filters.budgetMax !== undefined
                    ? filters.budgetMax === 0
                      ? "Free only"
                      : `Up to ${formatBudget(filters.budgetMax)}`
                    : "Any budget"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Free only</SelectItem>
                {BUDGET_OPTIONS.map((amount) => (
                  <SelectItem key={amount} value={String(amount)}>
                    Up to {formatBudget(amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FilterChips
            label="Area"
            options={AREA_OPTIONS.map((name) => ({ value: name, label: name }))}
            selected={filters.area ?? []}
            onChange={(next) => onChange({ area: next.length > 0 ? next : undefined })}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-spots">Open spots needed</Label>
            <Select
              value={filters.minSpots !== undefined ? String(filters.minSpots) : null}
              onValueChange={(value) =>
                onChange({ minSpots: value === null ? undefined : Number(value) })
              }
            >
              <SelectTrigger id="filter-spots" className="w-full">
                <SelectValue>
                  {filters.minSpots !== undefined ? `Room for ${filters.minSpots}+` : "Any size"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Room for {n}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pb-4">
            <Button variant="outline" className="flex-1" onClick={onReset}>
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Reset all
            </Button>
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { DAY_OPTIONS, TIME_OPTIONS, AREA_OPTIONS };

/** Multi-select pill row: tapping a value toggles it in/out of `selected`. */
function FilterChips<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label id={`filter-${label.toLowerCase().replaceAll(" ", "-")}-label`}>{label}</Label>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((value) => value !== option.value)
                    : [...selected, option.value],
                )
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
