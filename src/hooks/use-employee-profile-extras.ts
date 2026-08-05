"use client";

import { useEffect, useState } from "react";
import { buildMockEmployeeProfileExtras } from "@/mocks/employee-profile";
import { loadEmployeeProfileExtras } from "@/services/employees.service";
import { isLocalMode } from "@/lib/env";
import type { Employee } from "@/types";
import type { EmployeeProfileExtras } from "@/types/employee-profile";

/**
 * Loads profile extras via service (API or local).
 * Local mode may seed immediately; API mode waits for the network response.
 */
export function useEmployeeProfileExtras(
  employee: Employee | null | undefined
): EmployeeProfileExtras | null {
  const [extras, setExtras] = useState<EmployeeProfileExtras | null>(() =>
    employee && isLocalMode()
      ? buildMockEmployeeProfileExtras(employee)
      : null
  );

  const employeeId = employee?.id;

  useEffect(() => {
    if (!employee || !employeeId) {
      setExtras(null);
      return;
    }
    const current = employee;
    if (isLocalMode()) {
      setExtras(buildMockEmployeeProfileExtras(current));
    } else {
      setExtras(null);
    }
    let cancelled = false;
    void loadEmployeeProfileExtras(current).then((res) => {
      if (!cancelled && res.success && res.data) setExtras(res.data);
    });
    return () => {
      cancelled = true;
    };
    // intentionally key off id — parent may pass a new object each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  return extras;
}
