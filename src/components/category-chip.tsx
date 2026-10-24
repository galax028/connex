import Link from "next/link";

import { CATEGORY_LABELS, type Category } from "@/lib/data/types";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

const CATEGORY_EMOJI: Record<Category, string> = {
  sports: "🏸",
  food: "🍜",
  gaming: "🎮",
  studying: "📚",
  arts: "🎨",
  music: "🎤",
  outdoor: "🏕️",
  other: "✨",
};

export function CategoryIcon({ category }: { category: Category }) {
  return (
    <span aria-hidden="true" className="text-sm leading-none">
      {CATEGORY_EMOJI[category]}
    </span>
  );
}

export function CategoryChip({
  category,
  href,
  active,
  className,
}: {
  category: Category;
  href?: string;
  active?: boolean;
  className?: string;
}) {
  const label = CATEGORY_LABELS[category];
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
