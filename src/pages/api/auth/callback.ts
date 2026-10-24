import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;
  if (!code) {
    return res.redirect(302, "/signin?error=missing_code");
  }

  const supabase = createServerClient(req, res);
  const { data: auth, error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError) {
    console.error("AUTHERROR", authError);
    return res.redirect(
      302,
      `/signin?error=${encodeURIComponent(authError.code ?? "callback_error")}`,
    );
  }

  const upsert = await supabase.from("user_profiles").upsert(
    {
      id: auth.user.id,
      profile_url: auth.user.user_metadata.picture ?? "/favicon.svg",
      fullname: auth.user.user_metadata.name ?? auth.user.user_metadata.fullname,
    },
    { onConflict: "id" },
  );
  if (upsert.error) {
    console.log(upsert.error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  return res.redirect(302, "/");
}
