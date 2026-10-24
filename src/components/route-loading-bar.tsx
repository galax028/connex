import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { cn } from "cn";

type RouteChangeOptions = { shallow?: boolean };

const SHOW_DELAY_MS = 150;
// Keep in sync with the route-loading-fade duration in globals.css.
const FADE_MS = 250;

/**
 * Material Design linear progress indicator pinned to the top of the viewport
 * during client-side page transitions. Shown shortly after a route change
 * starts (so prefetched, near-instant navigations never flash it), plays a
 * smooth sweep across the track, and fades the whole indicator out when the
 * transition ends or fails. Shallow route updates and hash changes don't
 * trigger it.
 */
export function RouteLoadingBar() {
  const router = useRouter();
  const [phase, setPhase] = useState<"hidden" | "active" | "closing">("hidden");

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;

    const handleStart = (_url: string, options?: RouteChangeOptions) => {
      if (options?.shallow) return;
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      // A new navigation while the previous one is fading cancels the fade and
      // keeps the sweep running instead of popping back in.
      setPhase((current) => (current === "closing" ? "active" : current));
      showTimer = setTimeout(() => setPhase("active"), SHOW_DELAY_MS);
    };

    const handleEnd = (_url: string, options?: RouteChangeOptions) => {
      if (options?.shallow) return;
      clearTimeout(showTimer);
      setPhase((current) => (current === "active" ? "closing" : current));
      fadeTimer = setTimeout(() => setPhase("hidden"), FADE_MS);
    };

    const handleError = (_err: unknown, _url: string, options?: RouteChangeOptions) => {
      if (options?.shallow) return;
      handleEnd(_url);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleEnd);
    router.events.on("routeChangeError", handleError);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleEnd);
      router.events.off("routeChangeError", handleError);
    };
  }, [router]);

  if (phase === "hidden") return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden",
        phase === "closing" && "route-loading-closing",
      )}
    >
      <div className="route-loading-bar" />
    </div>
  );
}
