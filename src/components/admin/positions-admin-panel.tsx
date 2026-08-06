"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DepartmentBadge } from "@/components/employees/department-badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deletePosition,
  getPositions,
  savePosition,
} from "@/services/org.service";
import { useDepartments } from "@/hooks/use-departments";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { JobPosition } from "@/types/org";

export function PositionsAdminPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { activeNames } = useDepartments();
  const [items, setItems] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    id: "",
    title: "",
    department: "Engineering",
    grade: "L3",
    reportsTo: "",
  });

  async function reload() {
    const res = await getPositions();
    if (res.success) setItems(res.data);
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await reload();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSave() {
    if (!draft.title.trim()) {
      toast.error(t("common.error"));
      return;
    }
    setBusy(true);
    const res = await savePosition({
      id: draft.id || undefined,
      title: draft.title.trim(),
      department: draft.department,
      grade: draft.grade,
      reportsTo: draft.reportsTo.trim() || "—",
      active: true,
    } as Parameters<typeof savePosition>[0]);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setDraft({
      id: "",
      title: "",
      department: "Engineering",
      grade: "L3",
      reportsTo: "",
    });
    await reload();
    toast.success(t("admin.positionSaved"));
  }

  async function onDelete(id: string) {
    setBusy(true);
    const res = await deletePosition(id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    toast.success(t("admin.positionRemoved"));
  }

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
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
    >
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <Briefcase className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("admin.positionsTitle")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("admin.positionsDesc")}
        </p>
      </div>
      <div className="border-b border-border/60 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>{t("admin.position")}</Label>
            <Input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.department")}</Label>
            <select
              className="h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
              value={draft.department}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  department: e.target.value,
                }))
              }
            >
              {activeNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.grade")}</Label>
            <Input
              value={draft.grade}
              onChange={(e) =>
                setDraft((d) => ({ ...d, grade: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.reportingManager")}</Label>
            <Input
              value={draft.reportsTo}
              onChange={(e) =>
                setDraft((d) => ({ ...d, reportsTo: e.target.value }))
              }
            />
          </div>
        </div>
        <Button
          size="sm"
          className="mt-3"
          disabled={busy}
          onClick={() => void onSave()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          {draft.id ? t("common.save") : t("common.add")}
        </Button>
      </div>
      <div className="overflow-x-auto p-2 sm:p-3">
        <DataTable>
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("admin.position")}</DataTableHead>
              <DataTableHead>{t("common.department")}</DataTableHead>
              <DataTableHead>{t("admin.grade")}</DataTableHead>
              <DataTableHead>{t("admin.reportingManager")}</DataTableHead>
              <DataTableHead>{t("common.actions")}</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {items.map((pos) => (
              <DataTableRow key={pos.id}>
                <DataTableCell className="font-medium">{pos.title}</DataTableCell>
                <DataTableCell>
                  <DepartmentBadge department={pos.department} />
                </DataTableCell>
                <DataTableCell>
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs">
                    {pos.grade}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {pos.reportsTo}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDraft({
                          id: pos.id,
                          title: pos.title,
                          department: pos.department,
                          grade: pos.grade,
                          reportsTo: pos.reportsTo,
                        })
                      }
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onDelete(pos.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
    </motion.section>
  );
}
