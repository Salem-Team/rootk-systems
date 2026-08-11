"use client";

import { useCallback, useEffect, useState } from "react";
import { isValidReportDate } from "@/lib/daily-report";
import { todayKey } from "@/lib/mock-date";
import { getDailyReport } from "@/services/daily-report.service";
import type { DailyReport } from "@/types";

export function useDailyReportSheet() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayKey);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openReport = useCallback(() => {
    setDate(todayKey());
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open || !isValidReportDate(date)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getDailyReport(date).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setReport(null);
        setError(res.message ?? "Failed to load report");
        return;
      }
      setReport(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, date]);

  return {
    open,
    setOpen,
    openReport,
    date,
    setDate,
    loading,
    report,
    error,
  };
}
