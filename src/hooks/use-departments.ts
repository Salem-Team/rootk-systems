"use client";

import { useCallback, useEffect, useState } from "react";
import { DEPARTMENTS } from "@/constants";
import { getDepartments } from "@/services/org.service";
import type { OrgDepartment } from "@/types/org";

/** Load org department catalog for selects and admin UI. */
export function useDepartments() {
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await getDepartments();
    if (res.success) {
      setDepartments(res.data.filter((d) => !d.deletedAt));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await reload();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  const activeNames =
    departments.filter((d) => d.active).map((d) => d.name).length > 0
      ? departments.filter((d) => d.active).map((d) => d.name)
      : [...DEPARTMENTS];

  return {
    departments,
    activeNames,
    loading,
    reload,
  };
}
