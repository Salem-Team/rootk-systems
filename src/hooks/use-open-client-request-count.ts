"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { listCrmClientRequests } from "@/services/crm/crm-client-requests.service";
import { useSessionStore } from "@/stores/session-store";

export function useOpenClientRequestCount() {
  const user = useSessionStore((s) => s.user);
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const allowed = isProtectedAdminAccount({
    userId: user.id,
    employeeId: user.employeeId,
    email: user.email,
  });

  const refresh = useCallback(async () => {
    if (!allowed) {
      setCount(0);
      return;
    }
    const res = await listCrmClientRequests({ status: "open" });
    if (res.success) setCount(res.data.length);
  }, [allowed]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  return count;
}
