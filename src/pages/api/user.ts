import type { NextApiRequest, NextApiResponse } from "next";
import { getServerUser } from "@/lib/supabase/auth";
import { getUser } from "@/lib/supabase/queries/get-user";
import { createServerClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authUser = await getServerUser(req, res);
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createServerClient(req, res);
  const user = await getUser(supabase, authUser.id);

  if (!user) {
    return res.status(404).json({ error: "User profile not found" });
  }

  return res.status(200).json(user);
}
