import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;

  if (!code) {
    return res.redirect(302, "/login?error=missing_code");
  }

  const supabase = createServerClient(req, res);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return res.redirect(302, `/login?error=${encodeURIComponent(error.code ?? "callback_error")}`);
  }

  return res.redirect(302, "/");
}
