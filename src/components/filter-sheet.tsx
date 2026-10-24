import * as React from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

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
import type { DayWithin, TimeOfDay } from "@/lib/data/types";
import { formatBudget } from "@/lib/format";

export interface ManualFilters {
  category?: import("@/lib/data/types").Category;
  dayWithin?: DayWithin;
  timeOfDay?: TimeOfDay;
  budgetMax?: number;
  minSpots?: number;
  area?: string;
}

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
  onChange,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ManualFilters;
  onChange: (patch: Partial<ManualFilters>) => void;
  onReset: () => void;
}) {
  const activeCount = Object.values(filters).filter(Boolean).length;

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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-day">When</Label>
            <Select
              value={filters.dayWithin ?? null}
              onValueChange={(value) =>
                onChange({ dayWithin: (value as DayWithin | null) ?? undefined })
              }
            >
              <SelectTrigger id="filter-day" className="w-full">
                <SelectValue>
                  {filters.dayWithin
                    ? DAY_OPTIONS.find((option) => option.value === filters.dayWithin)?.label
                    : "Any day"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-time">Time of day</Label>
            <Select
              value={filters.timeOfDay ?? null}
              onValueChange={(value) =>
                onChange({ timeOfDay: (value as TimeOfDay | null) ?? undefined })
              }
            >
              <SelectTrigger id="filter-time" className="w-full">
                <SelectValue>
                  {filters.timeOfDay
                    ? TIME_OPTIONS.find((option) => option.value === filters.timeOfDay)?.label
                    : "Any time"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-area">Area</Label>
            <Select
              value={filters.area ?? null}
              onValueChange={(value) => onChange({ area: value ?? undefined })}
            >
              <SelectTrigger id="filter-area" className="w-full">
                <SelectValue>{filters.area ?? "Anywhere"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AREA_OPTIONS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
