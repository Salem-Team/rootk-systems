"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessRoute } from "@/constants/navigation";
import { useSessionStore } from "@/stores/session-store";

/** Redirect employees away from admin-only routes. */
export function RoleRedirect() {
  const role = useSessionStore((s) => s.role);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessRoute(role, pathname)) {
      router.replace("/dashboard");
    }
  }, [role, pathname, router]);

  return null;
}
