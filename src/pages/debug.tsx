import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { getUser } from "@/lib/supabase/queries/get-user";

export default function DebugPage() {
  const supabase = createBrowserClient();
  const [user, setUser] = useState<string | null>(null);

  useEffect(
    () => {
      (async () => {
        const { data: jwt, error: jwtError } = await supabase.auth.getClaims();
        if (jwtError || !jwt) return;

        const userData = await getUser(supabase, jwt.claims.sub);
        if (!userData) return;

        setUser(JSON.stringify(userData, undefined, 2));
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <main>
      <h1>User data:</h1>
      <pre>
        <code>{user}</code>
      </pre>
    </main>
  );
}
