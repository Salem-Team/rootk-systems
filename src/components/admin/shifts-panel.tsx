"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Save, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getShifts, saveShift } from "@/services/org.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { ShiftDefinition } from "@/types/org";
import type { TranslationPath } from "@/i18n";

function timeToPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h * 60 + m) / (24 * 60)) * 100;
}

export function ShiftsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
      aria-labelledby="shifts-heading"
    >
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
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-4"
      >
        {shifts.map((shift) => {
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
                <div>
                  <p className="text-[13px] font-semibold">{label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="time"
                      className="h-8 w-[7.5rem] font-mono text-xs"
                      value={shift.start}
                      onChange={(e) =>
                        setShifts((prev) =>
                          prev.map((s) =>
                            s.id === shift.id
                              ? { ...s, start: e.target.value }
                              : s
                          )
                        )
                      }
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="time"
                      className="h-8 w-[7.5rem] font-mono text-xs"
                      value={shift.end}
                      onChange={(e) =>
                        setShifts((prev) =>
                          prev.map((s) =>
                            s.id === shift.id
                              ? { ...s, end: e.target.value }
                              : s
                          )
                        )
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
        })}
      </motion.ul>
    </motion.section>
  );
}
