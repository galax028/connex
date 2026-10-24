import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type RouteChangeOptions = { shallow?: boolean };

/**
 * Material Design linear progress indicator pinned to the top of the viewport
 * during client-side page transitions. Shown shortly after a route change
 * starts (so prefetched, near-instant navigations never flash it), plays the
 * classic indeterminate sweep, and completes to full width with a fade-out
 * when the transition ends or fails. Shallow route updates and hash changes
 * don't trigger it.
 */
export function RouteLoadingBar() {
  const router = useRouter();
  const [phase, setPhase] = useState<"hidden" | "active" | "finishing">("hidden");

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;

    const handleStart = (_url: string, options?: RouteChangeOptions) => {
      if (options?.shallow) return;
      clearTimeout(showTimer);
      clearTimeout(finishTimer);
      showTimer = setTimeout(() => setPhase("active"), 150);
    };

    const handleEnd = (_url: string, options?: RouteChangeOptions) => {
      if (options?.shallow) return;
      clearTimeout(showTimer);
      setPhase((current) => (current === "active" ? "finishing" : "hidden"));
      finishTimer = setTimeout(() => setPhase("hidden"), 240);
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
      clearTimeout(finishTimer);
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
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 transform-gpu overflow-hidden"
    >
      {phase === "active" ? (
        <>
          <div className="route-loading-bar route-loading-bar-primary">
            <div className="route-loading-bar-inner" />
          </div>
          <div className="route-loading-bar route-loading-bar-secondary">
            <div className="route-loading-bar-inner" />
          </div>
        </>
      ) : (
        <div className="route-loading-finish" />
      )}
    </div>
  );
}
