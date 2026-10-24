import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { CalendarDays, Compass, Plus, Search, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Compass, exact: true },
  { href: "/search", label: "Search", icon: Search, exact: false },
  { href: "/create", label: "Create", icon: null, exact: true, center: true },
  { href: "/my", label: "My Activities", icon: CalendarDays, exact: false },
  { href: "/profile", label: "Profile", icon: User, exact: true },
];

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const desktopItems = NAV_ITEMS.filter((item) => !item.center);
  const mobileItems = NAV_ITEMS.filter((item) => !item.center);

  const railLink = (item: (typeof NAV_ITEMS)[number]) => {
    const active = isActive(router.pathname, item.href, item.exact);
    const Icon = item.icon!;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-4.5" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-6 border-r bg-sidebar px-4 py-6 lg:flex">
        <Link
          href="/"
          className="block w-fit rounded-lg px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Image
            src="/images/logo/logo-full-light.svg"
            alt="CONNEX"
            width={2028}
            height={555}
            className="h-10 w-auto"
          />
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {desktopItems.map(railLink)}
        </nav>
        <Button size="lg" className="mt-auto" render={<Link href="/create" />}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Start a plan
        </Button>
        <p className="px-1 text-xs text-muted-foreground">
          Live data from your CU account — sign out from your profile to switch.
        </p>
      </aside>

      <main id="main-content" className="w-full px-4 pt-6 pb-32 lg:pt-10 lg:pb-12 lg:pl-68">
        <div className="mx-auto w-full max-w-xl lg:max-w-4xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
          {mobileItems.slice(0, 2).map((item) => (
            <MobileNavItem key={item.href} item={item} pathname={router.pathname} />
          ))}
          <li className="flex justify-center">
            <Link
              href="/create"
              aria-label="Create a party"
              aria-current={router.pathname === "/create" ? "page" : undefined}
              className={cn(
                "-mt-6 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
                router.pathname === "/create" && "ring-4 ring-primary/30",
              )}
            >
              <Plus aria-hidden="true" className="size-6" />
            </Link>
          </li>
          {mobileItems.slice(2).map((item) => (
            <MobileNavItem key={item.href} item={item} pathname={router.pathname} />
          ))}
        </ul>
      </nav>
    </div>
  );
}

function MobileNavItem({ item, pathname }: { item: (typeof NAV_ITEMS)[number]; pathname: string }) {
  const active = isActive(pathname, item.href, item.exact);
  const Icon = item.icon!;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[0.65rem] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
        <span className="max-w-full truncate">{item.label}</span>
      </Link>
    </li>
  );
}
