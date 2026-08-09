import { Loader2, Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Time12Input } from "@/components/ui/time-12-input";
import { useTranslation } from "@/hooks/use-translation";
import type { ShiftType } from "@/types/org";
import { EMPTY_SHIFT_DRAFT, SHIFT_TYPE_LABEL, SHIFT_TYPES } from "./shift-constants";

export type ShiftDraft = typeof EMPTY_SHIFT_DRAFT;

export function ShiftCreateForm({
  draft,
  setDraft,
  busy,
  onCreate,
}: {
  draft: ShiftDraft;
  setDraft: (updater: (d: ShiftDraft) => ShiftDraft) => void;
  busy: boolean;
  onCreate: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3
          id="shifts-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold"
        >
          <Timer className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("admin.shiftsTitle")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("admin.shiftsDesc")}
        </p>
      </div>
      <div className="panel-body grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="shift-name">{t("common.name")}</Label>
          <Input
            id="shift-name"
            value={draft.name}
            onChange={(e) =>
              setDraft((d) => ({ ...d, name: e.target.value }))
            }
            placeholder={t("admin.shiftNamePlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shift-type">{t("admin.shiftType")}</Label>
          <select
            id="shift-type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={draft.type}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                type: e.target.value as ShiftType,
              }))
            }
          >
            {SHIFT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(SHIFT_TYPE_LABEL[type])}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("schedule.fromTime")}</Label>
          <Time12Input
            className="w-full"
            value={draft.start}
            onChange={(start) => setDraft((d) => ({ ...d, start }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("schedule.toTime")}</Label>
          <Time12Input
            className="w-full"
            value={draft.end}
            onChange={(end) => setDraft((d) => ({ ...d, end }))}
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button
            size="sm"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={onCreate}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
            {t("admin.addShift")}
          </Button>
        </div>
      </div>
    </div>
  );
}
