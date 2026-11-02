"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLoader } from "@/components/shared/brand-loader";
import { useSessionStore } from "@/stores/session-store";

export default function HomePage() {
  const router = useRouter();
  const authenticated = useSessionStore((s) => s.authenticated);

  useEffect(() => {
    router.replace(authenticated ? "/dashboard" : "/login");
  }, [authenticated, router]);

  return <BrandLoader variant="app" />;
}
