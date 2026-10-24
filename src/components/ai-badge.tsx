import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Marks content that came from the simulated AI pipeline. The tooltip text is
 * explicit that this is a prototype, never a live model or a guarantee.
 */
export function AiBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="default"
      title="Simulated AI recommendation (prototype — not live AI)"
      className={className}
    >
      <Sparkles data-icon="inline-start" aria-hidden="true" />
      AI
      <span className="sr-only">(simulated AI recommendation, prototype)</span>
    </Badge>
  );
}
