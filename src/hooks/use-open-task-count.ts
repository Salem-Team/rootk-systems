"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getMyWorkTasks, getWorkTasks } from "@/services/work.service";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { openTaskCount } from "@/lib/work-utils";

/** Live open-task badge for sidebar / mobile nav. */
export function useOpenTaskCount(): number {
  const role = useSessionStore((s) => s.role);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const res =
      role === "admin"
        ? await getWorkTasks()
        : await getMyWorkTasks(workEmployeeId);
    if (res.success) setCount(openTaskCount(res.data));
  }, [role, workEmployeeId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener(WORK_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(WORK_UPDATED_EVENT, onUpdate);
  }, [refresh]);

  return count;
}
