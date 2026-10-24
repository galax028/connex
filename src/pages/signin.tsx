import { useState } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase/client";
import { createUserServerClient } from "@/lib/supabase/server";
import { CircleAlert } from "lucide-react";

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const supabase = createUserServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { redirect: { destination: "/", permanent: false } };
  return { props: {} };
};

export default function Login() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const error =
    typeof router.query.error === "string"
      ? router.query.error === "missing_code"
        ? "Authentication failed. Please try again."
        : router.query.error
      : null;
  const [oauthError, setOauthError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setIsSubmitting(true);
    setOauthError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: [
          "openid",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ].join(),
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: "offline",
          hd: "student.chula.ac.th",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setIsSubmitting(false);
      setOauthError(error.message);
    }
  }

  return (
    <>
      <Head>
        <title>CONNEX · Sign in</title>
      </Head>

      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <header className="flex flex-col items-center gap-4">
          <Image
            src="/images/logo/logo-full-light.svg"
            alt="CONNEX"
            width={2028}
            height={555}
            priority
            className="h-10 w-auto dark:hidden"
          />
          <Image
            src="/images/logo/logo-full-dark.svg"
            alt=""
            aria-hidden="true"
            width={2028}
            height={555}
            priority
            className="hidden h-10 w-auto dark:block"
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading heading-1 font-semibold tracking-tight">Find your crew</h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your Chulalongkorn University Google account to continue.
            </p>
          </div>
        </header>

        <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-card p-6 text-left shadow-sm ring-1 ring-foreground/10">
          {(oauthError ?? error) ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {oauthError ?? error}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="h-11 w-full"
            onClick={signInWithGoogle}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Continue with Google"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Only <span className="font-medium text-foreground">student.chula.ac.th</span> accounts
            can sign in.
          </p>
        </div>
      </main>
    </>
  );
}
