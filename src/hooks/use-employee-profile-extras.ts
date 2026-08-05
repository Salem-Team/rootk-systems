"use client";

import { useEffect, useState } from "react";
import { buildMockEmployeeProfileExtras } from "@/mocks/employee-profile";
import { loadEmployeeProfileExtras } from "@/services/employees.service";
import type { Employee } from "@/types";
import type { EmployeeProfileExtras } from "@/types/employee-profile";

/**
 * Loads profile extras via service (API or local mock).
 * Seeds with local mock immediately, then hydrates from Nest in API mode.
 */
export function useEmployeeProfileExtras(
  employee: Employee | null | undefined
): EmployeeProfileExtras | null {
  const [extras, setExtras] = useState<EmployeeProfileExtras | null>(() =>
    employee ? buildMockEmployeeProfileExtras(employee) : null
  );

  const employeeId = employee?.id;

  useEffect(() => {
    if (!employee || !employeeId) {
      setExtras(null);
      return;
    }
    const current = employee;
    setExtras(buildMockEmployeeProfileExtras(current));
    let cancelled = false;
    void loadEmployeeProfileExtras(current).then((res) => {
      if (!cancelled && res.data) setExtras(res.data);
    });
    return () => {
      cancelled = true;
    };
    // intentionally key off id — parent may pass a new object each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  return extras;
}
