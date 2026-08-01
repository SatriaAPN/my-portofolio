"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { me } from "@/lib/api";
import type { User } from "@/lib/types";

// Guards admin pages: verifies the session cookie via /api/auth/me and
// redirects to the login page when unauthorized.
export function AdminGate({ children }: { children: (user: User) => ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "no">("loading");

  useEffect(() => {
    me()
      .then((u) => {
        setUser(u);
        setState("ok");
      })
      .catch(() => {
        setState("no");
        router.replace("/admin/login");
      });
  }, [router]);

  if (state !== "ok" || !user) {
    return (
      <div className="grid h-screen place-items-center" style={{ color: "#9098aa" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading…</span>
      </div>
    );
  }
  return <>{children(user)}</>;
}
