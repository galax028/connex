import type { AppProps } from "next/app";
import { Inter, Lora, Ubuntu_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppShell>
      <Component
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
        {...pageProps}
      />
    </AppShell>
  );
}
