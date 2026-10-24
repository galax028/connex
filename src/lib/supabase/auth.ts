import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@/lib/supabase/server";

export async function getServerUser(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerClient(req, res);
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}
