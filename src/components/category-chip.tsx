import Link from "next/link";

import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

/** DB category names (`party_categories.name`); NULL category renders as "Other". */
const CATEGORY_EMOJI: Record<string, string> = {
  Other: "✨",
  Arts: "🎨",
  Food: "🍜",
  Gaming: "🎮",
  Music: "🎤",
  Sightseeing: "🏕️",
  Sports: "🏸",
  Studying: "📚",
};

export function categoryLabel(category: string | null): string {
  return category ?? "Other";
}

export function CategoryIcon({ category }: { category: string | null }) {
  return (
    <span aria-hidden="true" className="text-sm leading-none">
      {CATEGORY_EMOJI[categoryLabel(category)] ?? "✨"}
    </span>
  );
}

export function CategoryChip({
  category,
  href,
  active,
  className,
}: {
  category: string | null;
  href?: string;
  active?: boolean;
  className?: string;
}) {
  const label = categoryLabel(category);
  const content = (
    <Badge
      variant={active ? "default" : "outline"}
      className={cn("h-7 px-2.5 text-[0.8rem]", className)}
    >
      <CategoryIcon category={category} />
      {label}
    </Badge>
  );
  if (!href) return content;
  return (
    <Link
      href={href}
      className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`Browse ${label} activities`}
    >
      {content}
    </Link>
  );
}
