"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Plus, Save, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Time12Input } from "@/components/ui/time-12-input";
import {
  deleteShift,
  getShifts,
  saveShift,
} from "@/services/org.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { ShiftDefinition, ShiftType } from "@/types/org";
import type { TranslationPath } from "@/i18n";

const SHIFT_COLORS = [
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
];

const SHIFT_TYPE_LABEL: Record<ShiftType, TranslationPath> = {
  morning: "admin.shiftMorning",
  evening: "admin.shiftEvening",
  night: "admin.shiftNight",
  flexible: "admin.shiftFlexible",
  hybrid: "admin.shiftHybrid",
  remote: "admin.shiftRemote",
};

const SHIFT_TYPES = Object.keys(SHIFT_TYPE_LABEL) as ShiftType[];

function timeToPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h * 60 + m) / (24 * 60)) * 100;
}

const EMPTY_DRAFT = {
  id: "",
  name: "",
  type: "morning" as ShiftType,
  start: "09:00",
  end: "18:00",
  color: SHIFT_COLORS[0],
  active: true,
};

export function ShiftsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  async function reload() {
    const res = await getShifts();
    if (res.success) setShifts(res.data);
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

  async function persist(next: ShiftDefinition) {
    setBusy(true);
    const res = await saveShift(next);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    toast.success(t("admin.shiftSaved"));
  }

  async function onCreate() {
    if (!draft.name.trim()) {
      toast.error(t("common.error"));
      return;
    }
    setBusy(true);
    const res = await saveShift({
      name: draft.name.trim(),
      type: draft.type,
      start: draft.start,
      end: draft.end,
      color: draft.color,
      active: true,
    } as Parameters<typeof saveShift>[0]);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setDraft({
      ...EMPTY_DRAFT,
      color: SHIFT_COLORS[shifts.length % SHIFT_COLORS.length],
    });
    await reload();
    toast.success(t("admin.shiftCreated"));
  }

  async function onDelete(id: string) {
    setBusy(true);
    const res = await deleteShift(id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    toast.success(t("admin.shiftRemoved"));
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
      className="space-y-3"
      aria-labelledby="shifts-heading"
    >
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
              onClick={() => void onCreate()}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              {t("admin.addShift")}
            </Button>
          </div>
        </div>
      </div>

      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="surface-panel panel-body space-y-4"
      >
        {shifts.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </li>
        ) : (
          shifts.map((shift) => {
            const start = timeToPercent(shift.start);
            let end = timeToPercent(shift.end);
            const wraps = end <= start;
            if (wraps) end += 100;
            const width = Math.min(end - start, 100 - start);
            const label = shift.nameKey
              ? t(shift.nameKey as TranslationPath)
              : shift.name;

            return (
              <motion.li
                key={shift.id}
                variants={fadeInUp}
                className={cn(
                  "rounded-xl border border-border/70 bg-muted/15 p-3.5",
                  !shift.active && "opacity-60"
                )}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={shift.name}
                      onChange={(e) =>
                        setShifts((prev) =>
                          prev.map((s) =>
                            s.id === shift.id
                              ? { ...s, name: e.target.value, nameKey: undefined }
                              : s
                          )
                        )
                      }
                      aria-label={t("common.name")}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Time12Input
                        className="w-[13.5rem]"
                        value={shift.start}
                        onChange={(startTime) =>
                          setShifts((prev) =>
                            prev.map((s) =>
                              s.id === shift.id
                                ? { ...s, start: startTime }
                                : s
                            )
                          )
                        }
                        aria-label={t("schedule.fromTime")}
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Time12Input
                        className="w-[13.5rem]"
                        value={shift.end}
                        onChange={(endTime) =>
                          setShifts((prev) =>
                            prev.map((s) =>
                              s.id === shift.id ? { ...s, end: endTime } : s
                            )
                          )
                        }
                        aria-label={t("schedule.toTime")}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={shift.active}
                      onCheckedChange={(on) =>
                        setShifts((prev) =>
                          prev.map((s) =>
                            s.id === shift.id ? { ...s, active: on } : s
                          )
                        )
                      }
                      aria-label={label}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void persist(shift)}
                    >
                      {busy ? <Loader2 className="animate-spin" /> : <Save />}
                      {t("common.save")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onDelete(shift.id)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div
                  className="relative h-3 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${shift.start} to ${shift.end}`}
                >
                  <span
                    className={cn(
                      "absolute inset-y-0 rounded-full opacity-90",
                      shift.color
                    )}
                    style={{ left: `${start}%`, width: `${width}%` }}
                  />
                </div>
              </motion.li>
            );
          })
        )}
      </motion.ul>
    </motion.section>
  );
}
