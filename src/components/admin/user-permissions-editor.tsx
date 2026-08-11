"use client";

import { useMemo, useState, type ReactNode } from "react";
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
    <div className="space-y-3 sm:space-y-4">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:start-2.5 sm:h-3.5 sm:w-3.5" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("permissions.searchPermissions")}
          className="h-11 ps-10 text-base sm:h-9 sm:ps-8 sm:text-sm"
        />
      </div>

      <div className="-mx-1">
        <div className="scroll-x flex snap-x snap-mandatory gap-1.5 px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ModuleChip
            active={moduleId === "all"}
            onClick={() => setModuleId("all")}
          >
            {t("common.all")}
          </ModuleChip>
          {PERMISSION_MODULES.map((mod) => (
            <ModuleChip
              key={mod}
              active={moduleId === mod}
              onClick={() => setModuleId(mod)}
            >
              {t(permissionModuleLabelKey(mod))}
            </ModuleChip>
          ))}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {grouped.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </p>
        ) : null}
        {grouped.map((group) => {
          const enabledCount = group.items.filter((item) =>
            effective.has(item.id)
          ).length;
          return (
            <section
              key={group.module}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 sm:rounded-xl"
            >
              <div className="flex flex-col gap-2.5 border-b border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-4 sm:py-2.5">
                <div className="min-w-0">
                  <h4 className="text-[0.92rem] font-semibold leading-snug sm:text-sm">
                    {t(permissionModuleLabelKey(group.module))}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t("permissions.enabledCount", {
                      enabled: enabledCount,
                      total: group.items.length,
                    })}
                  </p>
                </div>
                {!locked ? (
                  <div className="grid grid-cols-2 gap-1 sm:flex sm:w-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 min-h-9 px-2.5 text-[12px] sm:h-8"
                      onClick={() => setModuleAll(group.module, true)}
                    >
                      {t("permissions.grantAll")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 min-h-9 px-2.5 text-[12px] sm:h-8"
                      onClick={() => setModuleAll(group.module, false)}
                    >
                      {t("permissions.revokeAll")}
                    </Button>
                  </div>
                ) : null}
              </div>
              {group.module === "dataAccess" ? (
                <p className="border-b border-border/50 bg-amber-500/5 px-3 py-2.5 text-[12px] leading-relaxed text-amber-950 dark:text-amber-100 sm:px-4 sm:py-2">
                  {t("permissions.dataAccessHint")}
                </p>
              ) : null}
              <ul className="divide-y divide-border/50">
                {group.items.map((item) => {
                  const granted = effective.has(item.id);
                  const isDefault = defaults.has(item.id) === granted;
                  return (
                    <li key={item.id}>
                      <div
                        className={cn(
                          "flex items-start gap-3 px-3 py-3.5 sm:items-center sm:px-4 sm:py-2.5",
                          granted && "bg-primary/[0.03]"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[0.92rem] font-medium leading-snug sm:text-sm">
                              {t(permissionLabelKey(item.id))}
                            </p>
                            {!isDefault ? (
                              <Badge
                                variant="warning"
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {t("permissions.customized")}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground sm:mt-0.5">
                            {t(permissionDescKey(item.id))}
                          </p>
                        </div>
                        <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-center self-center">
                          <Switch
                            checked={granted}
                            disabled={locked}
                            onCheckedChange={(checked) =>
                              onChange(item.id, checked)
                            }
                            aria-label={t(permissionLabelKey(item.id))}
                          />
                        </div>
                      </div>
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

function ModuleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 snap-start touch-manipulation items-center rounded-full border px-3.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8 sm:px-2.5",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/70 text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
