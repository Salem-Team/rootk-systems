"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addHoliday,
  getHolidays,
  removeHoliday,
} from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { Holiday } from "@/types";
import type { TranslationPath } from "@/i18n";

const KIND_STYLE = {
  holiday: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  event: "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300",
} as const;

const KIND_LABEL: Record<Holiday["type"], TranslationPath> = {
  holiday: "admin.calHoliday",
  event: "admin.calEvent",
};

export function CompanyCalendarAdminPanel() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [events, setEvents] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<Holiday["type"]>("holiday");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const res = await getHolidays();
    if (res.success) setEvents(res.data);
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

  async function onAdd() {
    if (!name.trim() || !date) {
      toast.error(t("common.error"));
      return;
    }
    setBusy(true);
    const res = await addHoliday({
      id: `hol-${Date.now()}`,
      name: name.trim(),
      date,
      type,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setName("");
    setDate("");
    await reload();
    toast.success(t("admin.calendarSaved"));
  }

  async function onRemove(id: string) {
    setBusy(true);
    const res = await removeHoliday(id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    toast.success(t("admin.calendarRemoved"));
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
          <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("admin.calendarTitle")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("admin.calendarDesc")}
        </p>
      </div>
      <div className="border-b border-border/60 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="cal-name">{t("common.name")}</Label>
            <Input
              id="cal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-date">{t("common.date")}</Label>
            <Input
              id="cal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-type">{t("common.type")}</Label>
            <select
              id="cal-type"
              className="h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as Holiday["type"])}
            >
              <option value="holiday">{t("admin.calHoliday")}</option>
              <option value="event">{t("admin.calEvent")}</option>
            </select>
          </div>
        </div>
        <Button
          size="sm"
          className="mt-3"
          disabled={busy}
          onClick={() => void onAdd()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          {t("common.add")}
        </Button>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-2"
      >
        {events.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </li>
        ) : (
          events.map((event) => (
            <motion.li
              key={event.id}
              variants={fadeInUp}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{event.name}</p>
                <time
                  className="text-[11px] text-muted-foreground"
                  dateTime={event.date}
                >
                  {format(parseISO(event.date), "EEEE, MMM d", {
                    locale: dateLocale,
                  })}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    KIND_STYLE[event.type]
                  )}
                >
                  {t(KIND_LABEL[event.type])}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onRemove(event.id)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </motion.li>
          ))
        )}
      </motion.ul>
    </motion.section>
  );
}
