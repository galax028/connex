import { useState } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { createBrowserClient } from "@/lib/supabase/client";
import { createUserServerClient } from "@/lib/supabase/server";

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
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Sign in to CONNEX
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Use your Chulalongkorn University Google account to continue.
        </p>

        {(oauthError ?? error) ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          >
            {oauthError ?? error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isSubmitting}
          className="mt-6 h-12 w-full rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:outline-white"
        >
          {isSubmitting ? "Signing in…" : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}
