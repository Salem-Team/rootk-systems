"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session-store";

export default function HomePage() {
  const router = useRouter();
  const authenticated = useSessionStore((s) => s.authenticated);

  useEffect(() => {
    router.replace(authenticated ? "/dashboard" : "/login");
  }, [authenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-pulse rounded-lg bg-primary/20" />
    </div>
  );
}
