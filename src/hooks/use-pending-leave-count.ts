"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getPendingLeaveRequests } from "@/services/leave.service";
import { useSessionStore } from "@/stores/session-store";
import { LEAVE_UPDATED_EVENT } from "@/lib/events";

export function usePendingLeaveCount() {
  const role = useSessionStore((s) => s.role);
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (role !== "admin") {
      setCount(0);
      return;
    }
    const res = await getPendingLeaveRequests();
    if (res.success) setCount(res.data.length);
  }, [role]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener(LEAVE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(LEAVE_UPDATED_EVENT, onUpdate);
  }, [refresh]);

  return count;
}
