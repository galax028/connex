import { useEffect, useState } from "react";

export default function DebugPage() {
  const [user, setUser] = useState<string | null>(null);
  const [parties, setParties] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/user");

      if (!response.ok) {
        setUser(`Request failed: ${response.status}`);
        return;
      }

      const userData = await response.json();
      setUser(JSON.stringify(userData, undefined, 2));
    })();
  }, []);

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
