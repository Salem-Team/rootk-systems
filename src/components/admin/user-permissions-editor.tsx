"use client";

import { useMemo, useState } from "react";
import {
  PERMISSION_CATALOG,
  PERMISSION_MODULES,
  type PermissionId,
  type PermissionModuleId,
} from "@/constants/permissions";
import {
  permissionDescKey,
  permissionLabelKey,
  permissionModuleLabelKey,
} from "@/lib/permission-i18n";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export function UserPermissionsEditor({
  effective,
  defaults,
  locked,
  onChange,
}: {
  effective: Set<PermissionId>;
  defaults: Set<PermissionId>;
  locked: boolean;
  onChange: (id: PermissionId, granted: boolean) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [moduleId, setModuleId] = useState<PermissionModuleId | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PERMISSION_CATALOG.filter((item) => {
      if (moduleId !== "all" && item.module !== moduleId) return false;
      if (!q) return true;
      const label = t(permissionLabelKey(item.id)).toLowerCase();
      const desc = t(permissionDescKey(item.id)).toLowerCase();
      const moduleLabel = t(permissionModuleLabelKey(item.module)).toLowerCase();
      return (
        label.includes(q) ||
        desc.includes(q) ||
        moduleLabel.includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [moduleId, query, t]);

  const grouped = useMemo(() => {
    const map = new Map<PermissionModuleId, typeof filtered>();
    for (const item of filtered) {
      const list = map.get(item.module) ?? [];
      list.push(item);
      map.set(item.module, list);
    }
    return PERMISSION_MODULES.map((mod) => ({
      module: mod,
      items: map.get(mod) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [filtered]);

  function setModuleAll(mod: PermissionModuleId, granted: boolean) {
    PERMISSION_CATALOG.filter((item) => item.module === mod).forEach((item) => {
      onChange(item.id, granted);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("permissions.searchPermissions")}
            className="ps-8"
          />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setModuleId("all")}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-medium",
            moduleId === "all"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          )}
        >
          {t("common.all")}
        </button>
        {PERMISSION_MODULES.map((mod) => (
          <button
            key={mod}
            type="button"
            onClick={() => setModuleId(mod)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-medium",
              moduleId === mod
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            {t(permissionModuleLabelKey(mod))}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {grouped.map((group) => {
          const enabledCount = group.items.filter((item) =>
            effective.has(item.id)
          ).length;
          return (
            <section
              key={group.module}
              className="overflow-hidden rounded-xl border border-border/70 bg-card/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
                <div>
                  <h4 className="text-sm font-semibold">
                    {t(permissionModuleLabelKey(group.module))}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {t("permissions.enabledCount", {
                      enabled: enabledCount,
                      total: group.items.length,
                    })}
                  </p>
                </div>
                {!locked ? (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setModuleAll(group.module, true)}
                    >
                      {t("permissions.grantAll")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setModuleAll(group.module, false)}
                    >
                      {t("permissions.revokeAll")}
                    </Button>
                  </div>
                ) : null}
              </div>
              {group.module === "dataAccess" ? (
                <p className="border-b border-border/50 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-950 dark:text-amber-100 sm:px-4">
                  {t("permissions.dataAccessHint")}
                </p>
              ) : null}
              <ul className="divide-y divide-border/50">
                {group.items.map((item) => {
                  const granted = effective.has(item.id);
                  const isDefault = defaults.has(item.id) === granted;
                  return (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 px-3 py-2.5 sm:px-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-medium leading-snug">
                            {t(permissionLabelKey(item.id))}
                          </p>
                          {!isDefault ? (
                            <Badge variant="warning">
                              {t("permissions.customized")}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                          {t(permissionDescKey(item.id))}
                        </p>
                      </div>
                      <Switch
                        checked={granted}
                        disabled={locked}
                        onCheckedChange={(checked) =>
                          onChange(item.id, checked)
                        }
                        aria-label={t(permissionLabelKey(item.id))}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
