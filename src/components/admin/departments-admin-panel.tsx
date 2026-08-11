"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { getEmployees } from "@/services/employees.service";
import {
  deleteDepartment,
  getDepartments,
  saveDepartment,
} from "@/services/org.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { Employee } from "@/types";
import type { OrgDepartment } from "@/types/org";

export function DepartmentsAdminPanel() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<OrgDepartment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    id: "",
    name: "",
    nameAr: "",
    code: "",
    color: "#082868",
    active: true,
  });

  async function reload() {
    const [deptRes, empRes] = await Promise.all([
      getDepartments(),
      getEmployees(),
    ]);
    if (deptRes.success) setItems(deptRes.data);
    if (empRes.success) setEmployees(empRes.data);
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

  const headcount = useMemo(() => {
    const map = new Map<string, number>();
    for (const emp of employees) {
      if (emp.deletedAt) continue;
      map.set(emp.department, (map.get(emp.department) ?? 0) + 1);
    }
    return map;
  }, [employees]);

  async function onSave() {
    if (!draft.name.trim()) {
      toast.error(t("admin.departmentNameRequired"));
      return;
    }
    setBusy(true);
    const res = await saveDepartment({
      ...(draft.id ? { id: draft.id } : {}),
      name: draft.name.trim(),
      nameAr: draft.nameAr.trim() || undefined,
      code: draft.code.trim() || undefined,
      color: draft.color || "#082868",
      active: draft.active,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setDraft({
      id: "",
      name: "",
      nameAr: "",
      code: "",
      color: "#082868",
      active: true,
    });
    await reload();
    toast.success(t("admin.departmentSaved"));
  }

  async function onDelete(id: string) {
    setBusy(true);
    const res = await deleteDepartment(id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    toast.success(t("admin.departmentRemoved"));
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
          <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("admin.departmentsTitle")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("admin.departmentsCrudDesc")}
        </p>
      </div>
      <div className="border-b border-border/60 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>{t("admin.departmentName")}</Label>
            <Input
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="Engineering"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.departmentNameAr")}</Label>
            <Input
              value={draft.nameAr}
              onChange={(e) =>
                setDraft((d) => ({ ...d, nameAr: e.target.value }))
              }
              placeholder="الهندسة"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.departmentCode")}</Label>
            <Input
              value={draft.code}
              onChange={(e) =>
                setDraft((d) => ({ ...d, code: e.target.value }))
              }
              placeholder="ENG"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.departmentColor")}</Label>
            <Input
              type="color"
              value={draft.color}
              onChange={(e) =>
                setDraft((d) => ({ ...d, color: e.target.value }))
              }
              className="h-9 cursor-pointer p-1"
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.active}
                onCheckedChange={(active) =>
                  setDraft((d) => ({ ...d, active }))
                }
              />
              <Label>{t("status.active")}</Label>
            </div>
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
      <div className="table-scroll p-2 sm:p-3">
        <DataTable>
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("common.department")}</DataTableHead>
              <DataTableHead>{t("admin.departmentCode")}</DataTableHead>
              <DataTableHead>{t("admin.employeeCount")}</DataTableHead>
              <DataTableHead>{t("common.status")}</DataTableHead>
              <DataTableHead>{t("common.actions")}</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {items.map((dept) => (
              <DataTableRow key={dept.id}>
                <DataTableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: dept.color }}
                      aria-hidden
                    />
                    <DepartmentBadge
                      department={dept.name}
                      nameAr={dept.nameAr}
                    />
                    {locale === "en" && dept.nameAr ? (
                      <span className="text-xs text-muted-foreground">
                        {dept.nameAr}
                      </span>
                    ) : null}
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs">
                    {dept.code || "—"}
                  </span>
                </DataTableCell>
                <DataTableCell className="tabular-nums">
                  {headcount.get(dept.name) ?? 0}
                </DataTableCell>
                <DataTableCell>
                  {dept.active ? t("status.active") : t("status.inactive")}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDraft({
                          id: dept.id,
                          name: dept.name,
                          nameAr: dept.nameAr ?? "",
                          code: dept.code ?? "",
                          color: dept.color,
                          active: dept.active,
                        })
                      }
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onDelete(dept.id)}
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
