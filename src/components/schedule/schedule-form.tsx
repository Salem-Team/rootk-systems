"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateWorkSchedule } from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { DayOfWeek, WorkSchedule } from "@/types";

const WEEK_ORDER: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

interface ScheduleFormProps {
  schedule: WorkSchedule;
  onSaved?: (schedule: WorkSchedule) => void;
}

export function ScheduleForm({ schedule, onSaved }: ScheduleFormProps) {
  const { t } = useTranslation();
  const [fromTime, setFromTime] = useState(schedule.fromTime);
  const [toTime, setToTime] = useState(schedule.toTime);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(
    schedule.gracePeriodMinutes
  );
  const [breakMinutes, setBreakMinutes] = useState(schedule.breakMinutes);
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>(schedule.workingDays);
  const [wfhDays, setWfhDays] = useState<DayOfWeek[]>(schedule.wfhDays);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFromTime(schedule.fromTime);
    setToTime(schedule.toTime);
    setGracePeriodMinutes(schedule.gracePeriodMinutes);
    setBreakMinutes(schedule.breakMinutes);
    setWorkingDays(schedule.workingDays);
    setWfhDays(schedule.wfhDays);
  }, [schedule]);

  function toggleWorkingDay(day: DayOfWeek) {
    setWorkingDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day];
      setWfhDays((wfh) => wfh.filter((d) => next.includes(d)));
      return next;
    });
  }

  function toggleWfhDay(day: DayOfWeek) {
    if (!workingDays.includes(day)) return;
    setWfhDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    if (!fromTime || !toTime) {
      toast.error(t("common.error"));
      return;
    }
    if (workingDays.length === 0) {
      toast.error(t("common.error"));
      return;
    }

    setSaving(true);
    try {
      const weekendDays = WEEK_ORDER.filter((d) => !workingDays.includes(d));
      const res = await updateWorkSchedule({
        fromTime,
        toTime,
        gracePeriodMinutes: Number(gracePeriodMinutes) || 0,
        breakMinutes: Number(breakMinutes) || 0,
        workingDays,
        weekendDays,
        wfhDays: wfhDays.filter((d) => workingDays.includes(d)),
      });

      if (!res.success) {
        toast.error(t("common.error"));
        return;
      }

      toast.success(t("schedule.scheduleSaved"));
      onSaved?.(res.data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <Card className="transition-[box-shadow,border-color] duration-200 hover:border-primary/15 hover:shadow-[var(--shadow-card-hover)]">
        <CardHeader>
          <CardTitle>{t("schedule.title")}</CardTitle>
          <CardDescription>{t("schedule.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("schedule.fromTime")} htmlFor="fromTime">
              <Input
                id="fromTime"
                type="time"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
              />
            </Field>
            <Field label={t("schedule.toTime")} htmlFor="toTime">
              <Input
                id="toTime"
                type="time"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
              />
            </Field>
            <Field
              label={`${t("schedule.gracePeriod")} (${t("schedule.minutes")})`}
              htmlFor="grace"
            >
              <Input
                id="grace"
                type="number"
                min={0}
                max={120}
                value={gracePeriodMinutes}
                onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
              />
            </Field>
            <Field
              label={`${t("schedule.breakTime")} (${t("schedule.minutes")})`}
              htmlFor="break"
            >
              <Input
                id="break"
                type="number"
                min={0}
                max={180}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <Label>{t("schedule.workingDays")}</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {WEEK_ORDER.map((day) => {
                const active = workingDays.includes(day);
                const dayLabel = t(`days.${day}`);
                return (
                  <label
                    key={day}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted/30"
                    )}
                  >
                    <span className="text-sm font-medium">{dayLabel}</span>
                    <Switch
                      checked={active}
                      onCheckedChange={() => toggleWorkingDay(day)}
                      aria-label={dayLabel}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t("schedule.wfhDays")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("schedule.workingDays")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {WEEK_ORDER.map((day) => {
                const enabled = workingDays.includes(day);
                const active = wfhDays.includes(day);
                const dayLabel = t(`days.${day}`);
                return (
                  <label
                    key={`wfh-${day}`}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors",
                      !enabled && "cursor-not-allowed opacity-50",
                      enabled && active && "border-sky-500/30 bg-sky-500/10",
                      enabled && !active && "cursor-pointer border-border bg-muted/30"
                    )}
                  >
                    <span className="text-sm font-medium">{dayLabel}</span>
                    <Switch
                      checked={active}
                      disabled={!enabled}
                      onCheckedChange={() => toggleWfhDay(day)}
                      aria-label={dayLabel}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save />
              )}
              {t("schedule.saveSchedule")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
