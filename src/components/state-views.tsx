import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleAlert, CircleCheck, Compass, Inbox } from "lucide-react";
import { cn } from "cn";

export function PartyCardSkeleton() {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function LoadingList({ label = "Loading activities…" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      <PartyCardSkeleton />
      <PartyCardSkeleton />
      <PartyCardSkeleton />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actions,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center",
        className
      )}
    >
      <div aria-hidden="true" className="text-muted-foreground">
        {icon ?? <Inbox className="size-8" strokeWidth={1.5} />}
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {body ? <p className="max-w-xs text-sm text-muted-foreground">{body}</p> : null}
      {actions ? <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function DiscoverEmptyState({
  onReset,
  relaxActions = [],
  draftHref = "/create",
}: {
  onReset?: () => void;
  relaxActions?: Array<{ label: string; clear?: () => void; onClick?: () => void }>;
  draftHref?: string;
}) {
  return (
    <EmptyState
      icon={<Compass className="size-8" strokeWidth={1.5} />}
      title="No activities match these filters"
      body="Try widening a filter — or start your own plan and let people find you."
      actions={
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-1.5">
            {onReset ? (
              <Button variant="outline" size="sm" onClick={onReset}>
                Reset filters
              </Button>
            ) : null}
            {relaxActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => (action.onClick ? action.onClick() : action.clear?.())}
              >
                {action.label}
              </Button>
            ))}
          </div>
          <Button render={<Link href={draftHref} />}>Draft a plan</Button>
        </div>
      }
    />
  );
}

export function ErrorState({
  title = "Something went wrong",
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<CircleAlert className="size-8" strokeWidth={1.5} />}
      title={title}
      body={body ?? "This is a prototype — the mock data layer hit an unexpected state."}
      actions={
        onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}

export function SuccessBanner({
  title,
  body,
  actions,
  className,
}: {
  title: string;
  body?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-3",
        className
      )}
    >
      <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
        {actions ? <div className="mt-1 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
