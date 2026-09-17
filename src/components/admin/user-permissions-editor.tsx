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

type StatusFilter = "all" | "enabled" | "disabled" | "custom";

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PERMISSION_CATALOG.filter((item) => {
      if (moduleId !== "all" && item.module !== moduleId) return false;
      const granted = effective.has(item.id);
      const isDefault = defaults.has(item.id) === granted;
      if (statusFilter === "enabled" && !granted) return false;
      if (statusFilter === "disabled" && granted) return false;
      if (statusFilter === "custom" && isDefault) return false;
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
  }, [defaults, effective, moduleId, query, statusFilter, t]);

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
      <div className="sticky top-0 z-10 -mx-3 space-y-2 border-b border-border/50 bg-background/95 px-3 pb-2.5 pt-1 backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 sm:static sm:mx-0 sm:space-y-3 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:start-2.5 sm:h-3.5 sm:w-3.5" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("permissions.searchPermissions")}
            className="h-12 rounded-xl ps-10 text-base sm:h-9 sm:rounded-lg sm:ps-8 sm:text-sm"
            inputMode="search"
            enterKeyHint="search"
          />
        </div>

        <div className="space-y-1.5">
          <div className="scroll-x flex snap-x snap-mandatory gap-1.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ["all", "permissions.filterAll"],
                ["enabled", "permissions.filterEnabled"],
                ["disabled", "permissions.filterDisabled"],
                ["custom", "permissions.filterCustom"],
              ] as const
            ).map(([value, label]) => (
              <ModuleChip
                key={value}
                active={statusFilter === value}
                onClick={() => setStatusFilter(value)}
              >
                {t(label)}
              </ModuleChip>
            ))}
          </div>
          <div className="scroll-x flex snap-x snap-mandatory gap-1.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <div className="flex flex-col gap-2.5 border-b border-border/60 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-4 sm:py-2.5">
                <div className="min-w-0">
                  <h4 className="text-[0.95rem] font-semibold leading-snug sm:text-sm">
                    {t(permissionModuleLabelKey(group.module))}
                  </h4>
                  <p className="mt-0.5 text-[12px] text-muted-foreground sm:text-[11px]">
                    {t("permissions.enabledCount", {
                      enabled: enabledCount,
                      total: group.items.length,
                    })}
                  </p>
                </div>
                {!locked ? (
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-10 min-h-10 touch-manipulation px-2.5 text-[12px] sm:h-8 sm:min-h-8 sm:bg-transparent sm:hover:bg-accent"
                      onClick={() => setModuleAll(group.module, true)}
                    >
                      {t("permissions.grantAll")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-10 min-h-10 touch-manipulation px-2.5 text-[12px] sm:h-8 sm:min-h-8 sm:border-transparent sm:bg-transparent sm:hover:bg-accent"
                      onClick={() => setModuleAll(group.module, false)}
                    >
                      {t("permissions.revokeAll")}
                    </Button>
                  </div>
                ) : null}
              </div>
              {group.module === "dataAccess" ? (
                <p className="border-b border-border/50 bg-amber-500/5 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950 dark:text-amber-100 sm:px-4 sm:py-2 sm:text-[12px]">
                  {t("permissions.dataAccessHint")}
                </p>
              ) : null}
              <ul className="divide-y divide-border/50">
                {group.items.map((item) => {
                  const granted = effective.has(item.id);
                  const isDefault = defaults.has(item.id) === granted;
                  const label = t(permissionLabelKey(item.id));
                  return (
                    <li key={item.id}>
                      <div
                        role="button"
                        tabIndex={locked ? -1 : 0}
                        onClick={() => {
                          if (locked) return;
                          onChange(item.id, !granted);
                        }}
                        onKeyDown={(event) => {
                          if (locked) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onChange(item.id, !granted);
                          }
                        }}
                        className={cn(
                          "flex w-full touch-manipulation items-start gap-3 px-3.5 py-4 text-start transition-colors sm:items-center sm:px-4 sm:py-2.5",
                          granted && "bg-primary/[0.03]",
                          !locked &&
                            "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          locked && "cursor-default opacity-90"
                        )}
                        aria-pressed={granted}
                        aria-label={label}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[0.95rem] font-medium leading-snug sm:text-sm">
                              {label}
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
                          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground sm:mt-0.5 sm:text-[12px]">
                            {t(permissionDescKey(item.id))}
                          </p>
                        </div>
                        <div
                          className="flex min-h-12 min-w-12 shrink-0 items-center justify-center self-center"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <Switch
                            checked={granted}
                            disabled={locked}
                            onCheckedChange={(checked) =>
                              onChange(item.id, checked)
                            }
                            aria-label={label}
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
        "inline-flex min-h-11 shrink-0 snap-start touch-manipulation items-center rounded-full border px-3.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:min-h-8 sm:px-2.5",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/70 text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
