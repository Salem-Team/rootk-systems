"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { getEmployeePreferenceRows } from "@/services/user-preferences.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { EmployeePreferenceRow } from "@/types/preferences";

function appearanceLabel(
  appearance: EmployeePreferenceRow["appearance"],
  t: ReturnType<typeof useTranslation>["t"]
) {
  if (appearance === "light") return t("common.light");
  if (appearance === "dark") return t("common.dark");
  return t("common.system");
}

/** Admin visibility into employee personal preference overrides. */
export function EmployeePreferencesPanel() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<EmployeePreferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    const res = await getEmployeePreferenceRows();
    if (res.success) setRows(res.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load({ soft: true });
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="surface-panel overflow-hidden"
    >
      <div className="panel-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.employeePrefsTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.employeePrefsDesc")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load({ soft: true })}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          {t("common.refresh")}
        </Button>
      </div>
      <div className="table-scroll p-2 sm:p-3">
        <DataTable>
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("common.name")}</DataTableHead>
              <DataTableHead>{t("common.email")}</DataTableHead>
              <DataTableHead>{t("settings.languageSection")}</DataTableHead>
              <DataTableHead>{t("settings.theme")}</DataTableHead>
              <DataTableHead>{t("admin.prefStatus")}</DataTableHead>
              <DataTableHead>{t("admin.lastUpdated")}</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {rows.length === 0 ? (
              <DataTableRow>
                <DataTableCell colSpan={6} className="text-muted-foreground">
                  {t("common.noResults")}
                </DataTableCell>
              </DataTableRow>
            ) : (
              rows.map((row) => (
                <DataTableRow key={row.userId}>
                  <DataTableCell>
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {row.employeeId}
                      </p>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {row.email}
                  </DataTableCell>
                  <DataTableCell>
                    {row.language === "ar"
                      ? t("common.arabic")
                      : t("common.english")}
                  </DataTableCell>
                  <DataTableCell>
                    {appearanceLabel(row.appearance, t)}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge
                      variant={row.differsFromCompany ? "warning" : "secondary"}
                    >
                      {row.differsFromCompany
                        ? t("admin.prefCustomized")
                        : t("admin.prefAligned")}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell className="tabular-nums text-muted-foreground">
                    {row.updatedAt.slice(0, 16).replace("T", " ")}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </motion.section>
  );
}
