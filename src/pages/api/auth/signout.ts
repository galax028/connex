import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createServerClient(req, res);
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ error: "Failed to sign out" });
  }

  return res.status(204).end();
}
