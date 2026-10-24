import type { AppProps } from "next/app";
import { Inter, Lora, Ubuntu_Mono } from "next/font/google";
import { useRouter } from "next/router";
import { AppShell } from "@/components/app-shell";
import { RouteLoadingBar } from "@/components/route-loading-bar";
import "@/styles/globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Ubuntu_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
});

const PAGE_SHELL_EXEMPT = new Set(["/signin"]);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const component = (
    <Component
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
      {...pageProps}
    />
  );
  if (PAGE_SHELL_EXEMPT.has(router.pathname))
    return (
      <>
        <RouteLoadingBar />
        {component}
      </>
    );
  return (
    <>
      <RouteLoadingBar />
      <AppShell>{component}</AppShell>
    </>
  );
}
