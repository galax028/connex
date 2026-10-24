import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { Check, Link2, Share2 } from "lucide-react";

type CopyState = "idle" | "copied" | "error";

export function ShareButtons({
  title,
  text,
  className,
}: {
  title: string;
  text: string;
  className?: string;
}) {
  const [shareSupported, setShareSupported] = React.useState<boolean | null>(null);
  const [copyState, setCopyState] = React.useState<CopyState>("idle");
  const resetTimer = React.useRef<number | undefined>(undefined);

  // navigator.share only exists in the browser; resolve after mount to stay hydration-safe.
  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- navigator.share is only readable after mount */
    setShareSupported(typeof navigator.share === "function");
  }, []);

  React.useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const flash = (state: CopyState) => {
    setCopyState(state);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), 2000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash("copied");
    } catch {
      flash("error");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title, text, url: window.location.href });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      void copyLink();
    }
  };

  if (shareSupported === null) return null;

  const Icon = copyState === "copied" ? Check : shareSupported ? Share2 : Link2;
  const label =
    copyState === "copied"
      ? "Link copied"
      : copyState === "error"
        ? "Couldn’t copy"
        : shareSupported
          ? "Share"
          : "Copy link";

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={() => void (shareSupported ? share() : copyLink())}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      <span aria-live="polite">{label}</span>
    </Button>
  );
}
