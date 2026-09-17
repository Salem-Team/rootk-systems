"use client";

import { useMemo, useState } from "react";
import { addDays, format, isValid, parse, setHours, setMinutes } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Time12Input } from "@/components/ui/time-12-input";
import { useTranslation } from "@/hooks/use-translation";
import { toLocalInput } from "@/lib/crm/lead-form-options";
import { cn } from "@/lib/utils";

interface CrmDateTimeFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

function parseLocalValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function withTime(day: Date, hours: number, minutes: number): string {
  return toLocalInput(setMinutes(setHours(day, hours), minutes).toISOString());
}

/** Click-to-open calendar + time field for CRM follow-up scheduling. */
export function CrmDateTimeField({
  id,
  value,
  onChange,
  label,
  className,
}: CrmDateTimeFieldProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseLocalValue(value), [value]);
  const timeValue = selected ? format(selected, "HH:mm") : "10:00";

  function applyDate(day: Date | undefined) {
    if (!day) {
      onChange("");
      return;
    }
    const [h, m] = timeValue.split(":").map((n) => Number(n));
    onChange(withTime(day, Number.isFinite(h) ? h : 10, Number.isFinite(m) ? m : 0));
  }

  function applyTime(next: string) {
    const base = selected ?? new Date();
    const [h, m] = next.split(":").map((n) => Number(n));
    onChange(
      withTime(base, Number.isFinite(h) ? h : 10, Number.isFinite(m) ? m : 0)
    );
  }

  function applyQuick(daysAhead: number, hour = 10, minute = 0) {
    onChange(withTime(addDays(new Date(), daysAhead), hour, minute));
    setOpen(false);
  }

  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] leading-snug sm:text-sm">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={label}
            className={cn(
              "h-11 min-w-0 justify-start gap-2 touch-manipulation px-3 font-normal sm:h-10",
              !selected && "text-muted-foreground"
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate tabular-nums" dir="ltr">
              {selected
                ? format(selected, "EEE, d MMM yyyy · h:mm a", {
                    locale: dateLocale,
                  })
                : t("crm.feedback.pickDateTime")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="z-[70] w-[min(calc(100vw-2rem),20.5rem)] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-b border-border/60 p-2">
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 touch-manipulation"
                onClick={() => applyQuick(0, Math.max(new Date().getHours() + 1, 9), 0)}
              >
                {t("crm.feedback.quickToday")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 touch-manipulation"
                onClick={() => applyQuick(1)}
              >
                {t("crm.feedback.quickTomorrow")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 touch-manipulation"
                onClick={() => applyQuick(2)}
              >
                {t("crm.feedback.quickIn2Days")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 touch-manipulation"
                onClick={() => applyQuick(7)}
              >
                {t("crm.feedback.quickIn1Week")}
              </Button>
            </div>
          </div>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={applyDate}
            defaultMonth={selected ?? new Date()}
            locale={dateLocale}
            disabled={{ before: addDays(new Date(), -1) }}
          />
          <div className="grid gap-2 border-t border-border/60 p-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${id ?? "crm-dt"}-time`} className="text-[12px]">
                {t("crm.feedback.time")}
              </Label>
              <Time12Input
                id={`${id ?? "crm-dt"}-time`}
                value={timeValue}
                onChange={applyTime}
                aria-label={t("crm.feedback.time")}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 touch-manipulation text-muted-foreground"
                disabled={!value}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <X className="size-3.5" />
                {t("crm.feedback.clearDateTime")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 touch-manipulation"
                onClick={() => setOpen(false)}
              >
                {t("crm.feedback.done")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
