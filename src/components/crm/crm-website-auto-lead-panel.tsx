"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  getWebsiteAutoLead,
  updateWebsiteAutoLead,
  type WebsiteAutoLeadConfig,
} from "@/services/crm.service";
import type { Employee } from "@/types";

interface CrmWebsiteAutoLeadPanelProps {
  employees: Employee[];
  className?: string;
}

/** Admin controls for round-robin website lead assignment. */
export function CrmWebsiteAutoLeadPanel({
  employees,
  className,
}: CrmWebsiteAutoLeadPanelProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<WebsiteAutoLeadConfig | null>(null);

  const candidates = useMemo(() => {
    const active = (Array.isArray(employees) ? employees : []).filter(
      (e) => e.status === "active"
    );
    return [...active].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  async function load() {
    setLoading(true);
    const res = await getWebsiteAutoLead();
    setLoading(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.loadFailed"));
      return;
    }
    setConfig(res.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(next: WebsiteAutoLeadConfig) {
    setSaving(true);
    const res = await updateWebsiteAutoLead({
      enabled: next.enabled,
      employeeIds: next.employeeIds,
      effectiveFrom: next.effectiveFrom,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    setConfig(res.data);
    toast.success(t("crm.autoLead.saved"));
  }

  function toggleEmployee(id: string, on: boolean) {
    if (!config) return;
    const set = new Set(config.employeeIds);
    if (on) set.add(id);
    else set.delete(id);
    // Keep stable order: currently selected order, then newly added at end.
    const ordered = [
      ...config.employeeIds.filter((x) => set.has(x)),
      ...[...set].filter((x) => !config.employeeIds.includes(x)),
    ];
    void save({ ...config, employeeIds: ordered });
  }

  if (loading || !config) {
    return (
      <section
        className={cn(
          "surface-panel flex items-center justify-center p-8",
          className
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </section>
    );
  }

  const selected = new Set(config.employeeIds);

  return (
    <section className={cn("surface-panel", className)}>
      <div className="panel-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            {t("crm.autoLead.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("crm.autoLead.description")}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("crm.autoLead.effectiveFrom", { date: config.effectiveFrom })}
            {config.employeeIds.length > 0
              ? ` · ${t("crm.autoLead.nextHint", {
                  index: (config.nextIndex % config.employeeIds.length) + 1,
                  total: config.employeeIds.length,
                })}`
              : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="crm-auto-lead-enabled"
              checked={config.enabled}
              disabled={saving}
              onCheckedChange={(on) => void save({ ...config, enabled: on })}
            />
            <Label htmlFor="crm-auto-lead-enabled" className="text-[13px]">
              {config.enabled
                ? t("crm.autoLead.enabled")
                : t("crm.autoLead.disabled")}
            </Label>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving || loading}
            onClick={() => void load()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {candidates.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {t("crm.autoLead.emptyEmployees")}
          </p>
        ) : (
          candidates.map((emp) => {
            const on = selected.has(emp.id);
            return (
              <div
                key={emp.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{emp.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {emp.position}
                    {emp.department ? ` · ${emp.department}` : ""}
                  </p>
                </div>
                <Switch
                  checked={on}
                  disabled={saving || !config.enabled}
                  onCheckedChange={(v) => toggleEmployee(emp.id, v)}
                  aria-label={emp.name}
                />
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
