import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { getPartiesByOrganiser } from "@/lib/supabase/queries/get-parties-by-organiser";
import { getProfile } from "@/lib/supabase/queries/get-profile";

export default function DebugPage() {
  const supabase = createBrowserClient();
  const [user, setUser] = useState<string | null>(null);
  const [parties, setParties] = useState<string | null>(null);

  useEffect(
    () => {
      (async () => {
        const { data: jwt, error: jwtError } = await supabase.auth.getClaims();
        if (jwtError || !jwt) return;

        const userId = jwt.claims.sub;
        const userData = await getProfile(supabase, userId);
        if (!userData) return;

        setUser(JSON.stringify(userData, undefined, 2));

        const parties = await getPartiesByOrganiser(supabase, userId);
        if (!parties) return;

        setParties(JSON.stringify(parties, undefined, 2));
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <main>
      <h1>User Data:</h1>
      <pre>
        <code>{user}</code>
      </pre>
      <h1>User&apos;s Parties:</h1>
      <pre>
        <code>{parties}</code>
      </pre>
    </main>
  );
}
