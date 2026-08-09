"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCrmBusinessTypesPanel } from "@/hooks/use-crm-business-types-panel";
import { cn } from "@/lib/utils";

/** Admin CRUD for company / industry types used on leads. */
export function CrmBusinessTypesPanel({ className }: { className?: string }) {
  const panel = useCrmBusinessTypesPanel();
  const { t, sorted, draft } = panel;

  if (panel.loading) return <TableSkeleton rows={5} />;

  return (
    <section className={cn("surface-panel", className)}>
      <div className="panel-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            {t("crm.businessTypes.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("crm.businessTypes.description")}
          </p>
        </div>
        <Button type="button" size="sm" onClick={panel.openCreate}>
          <Plus className="me-1.5 h-3.5 w-3.5" />
          {t("crm.businessTypes.add")}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          className="m-4"
          title={t("crm.businessTypes.empty")}
          description={t("crm.businessTypes.emptyDesc")}
          actionLabel={t("crm.businessTypes.add")}
          onAction={panel.openCreate}
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {sorted.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold">{row.name}</p>
                  {!row.active ? (
                    <Badge variant="outline">{t("crm.stages.inactive")}</Badge>
                  ) : null}
                </div>
                {row.description ? (
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {row.description}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={row.active}
                  disabled={panel.busy}
                  onCheckedChange={() => void panel.toggleActive(row)}
                  aria-label={t("crm.stages.active")}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => panel.openEdit(row)}
                >
                  {t("crm.stages.edit")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={panel.busy}
                  onClick={() => void panel.onDelete(row)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={panel.formOpen} onOpenChange={panel.setFormOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {draft.id
                ? t("crm.businessTypes.edit")
                : t("crm.businessTypes.add")}
            </SheetTitle>
            <SheetDescription>
              {t("crm.businessTypes.formDesc")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="crm-bt-name">{t("crm.businessTypes.name")}</Label>
              <Input
                id="crm-bt-name"
                value={draft.name}
                onChange={(e) =>
                  panel.setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="crm-bt-desc">
                {t("crm.businessTypes.descriptionField")}
              </Label>
              <Textarea
                id="crm-bt-desc"
                rows={3}
                value={draft.description}
                onChange={(e) =>
                  panel.setDraft((d) => ({
                    ...d,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5">
              <Label htmlFor="crm-bt-active">{t("crm.stages.active")}</Label>
              <Switch
                id="crm-bt-active"
                checked={draft.active}
                onCheckedChange={(v) =>
                  panel.setDraft((d) => ({ ...d, active: v }))
                }
              />
            </div>
            <Button
              type="button"
              disabled={panel.busy}
              onClick={() => void panel.onSave()}
            >
              {panel.busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("crm.actions.save")
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
