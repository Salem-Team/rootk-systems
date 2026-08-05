"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarDays, Loader2, PartyPopper, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { addHoliday, removeHoliday } from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  holidayDescKey,
  holidayNameKey,
  translateOrFallback,
} from "@/lib/i18n-content";
import { cn } from "@/lib/utils";
import type { Holiday } from "@/types";

interface HolidaysListProps {
  holidays: Holiday[];
  onChanged?: (holidays: Holiday[]) => void;
  readOnly?: boolean;
}

export function HolidaysList({
  holidays,
  onChanged,
  readOnly = false,
}: HolidaysListProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [type, setType] = useState<Holiday["type"]>("holiday");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays]
  );

  function resetForm() {
    setName("");
    setDate(undefined);
    setType("holiday");
    setDescription("");
  }

  async function handleAdd() {
    if (!name.trim() || !date) {
      toast.error(t("common.error"));
      return;
    }

    setSaving(true);
    try {
      const res = await addHoliday({
        id: `${type === "holiday" ? "hol" : "evt"}-${Date.now()}`,
        name: name.trim(),
        date: format(date, "yyyy-MM-dd"),
        type,
        description: description.trim() || undefined,
      });
      if (!res.success) {
        toast.error(t("common.error"));
        return;
      }
      toast.success(t("schedule.holidayAdded"));
      onChanged?.([...holidays, res.data].sort((a, b) => a.date.localeCompare(b.date)));
      resetForm();
      setOpen(false);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      const res = await removeHoliday(id);
      if (!res.success) {
        toast.error(t("common.error"));
        return;
      }
      toast.success(t("schedule.holidayRemoved"));
      onChanged?.(holidays.filter((h) => h.id !== id));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <h3 className="text-[0.95rem] font-semibold">{t("schedule.holidays")}</h3>
          <p className="text-sm text-muted-foreground">{t("schedule.holidaysDesc")}</p>
        </div>
        {readOnly ? null : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus />
              {t("schedule.addHoliday")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("schedule.addHoliday")}</DialogTitle>
              <DialogDescription>{t("schedule.holidaysDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="holiday-name">{t("schedule.holidayName")}</Label>
                <Input
                  id="holiday-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("schedule.holidayDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays />
                      {date
                        ? format(date, "PPP", { locale: dateLocale })
                        : t("reports.pickDates")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t("schedule.holidayType")}</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as Holiday["type"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">{t("schedule.holiday")}</SelectItem>
                    <SelectItem value="event">{t("schedule.event")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-desc">{t("common.description")}</Label>
                <Textarea
                  id="holiday-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Plus />}
                {t("schedule.addHoliday")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>
      <div>
        {sorted.length === 0 ? (
          <EmptyState
            compact
            icon={PartyPopper}
            title={t("schedule.emptyHolidays")}
            description={t("schedule.holidaysDesc")}
            actionLabel={readOnly ? undefined : t("schedule.addHoliday")}
            onAction={readOnly ? undefined : () => setOpen(true)}
          />
        ) : (
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {sorted.map((holiday) => (
              <motion.li
                key={holiday.id}
                variants={fadeInUp}
                className="group list-row flex items-start justify-between gap-4 px-3.5 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      holiday.type === "holiday"
                        ? "border border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100"
                        : "border border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100"
                    )}
                  >
                    {holiday.type === "holiday" ? (
                      <CalendarDays className="h-4 w-4" />
                    ) : (
                      <PartyPopper className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {translateOrFallback(
                          t,
                          holidayNameKey(holiday.id),
                          holiday.name
                        )}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          holiday.type === "holiday"
                            ? "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100"
                            : "border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100"
                        )}
                      >
                        {holiday.type === "holiday"
                          ? t("schedule.holiday")
                          : t("schedule.event")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {format(parseISO(holiday.date), "EEEE, MMM d, yyyy", {
                        locale: dateLocale,
                      })}
                    </p>
                    {holiday.description ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {translateOrFallback(
                          t,
                          holidayDescKey(holiday.id),
                          holiday.description
                        )}
                      </p>
                    ) : null}
                  </div>
                </div>
                {readOnly ? null : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(holiday.id)}
                    disabled={removingId === holiday.id}
                    aria-label={t("schedule.remove")}
                  >
                    {removingId === holiday.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                )}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  );
}
