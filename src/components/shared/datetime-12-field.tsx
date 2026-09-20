"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  format,
  isValid,
  parse,
  setHours,
  setMinutes,
} from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CalendarDays, Clock3, X } from "lucide-react";
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
import { toDateTimeLocalValue } from "@/lib/flexible-datetime";
import { cn } from "@/lib/utils";

interface DateTime12FieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** When omitted, no label is rendered (use with outer Field). */
  label?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  /** Show Today / Tomorrow / +2d / +1w chips. Default true. */
  showQuickActions?: boolean;
  /** Allow clearing the value. Default true. */
  clearable?: boolean;
  /** Disable days before this (inclusive of today when omitted and pastDisabled). */
  disablePast?: boolean;
  disabled?: boolean;
}

function parseLocalValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
  if (isValid(parsed)) return parsed;
  const fallback = parse(value, "yyyy-MM-dd'T'HH:mm:ss", new Date());
  return isValid(fallback) ? fallback : undefined;
}

function withTime(day: Date, hours: number, minutes: number): string {
  return toDateTimeLocalValue(setMinutes(setHours(day, hours), minutes));
}

/**
 * Professional Tailwind date+time picker (12-hour clock).
 * Stores `yyyy-MM-ddTHH:mm` for datetime-local compatibility.
 */
export function DateTime12Field({
  id,
  value,
  onChange,
  label,
  placeholder,
  className,
  triggerClassName,
  showQuickActions = true,
  clearable = true,
  disablePast = false,
  disabled,
}: DateTime12FieldProps) {
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
    onChange(
      withTime(day, Number.isFinite(h) ? h : 10, Number.isFinite(m) ? m : 0)
    );
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
      {label ? (
        <Label htmlFor={id} className="text-[13px] leading-snug sm:text-sm">
          {label}
        </Label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={label ?? placeholder ?? t("dateTime.pick")}
            className={cn(
              "h-11 w-full min-w-0 justify-start gap-2.5 touch-manipulation rounded-xl border-border/85 bg-card px-3 text-base font-normal shadow-[0_1px_2px_rgba(11,20,36,0.03)] sm:h-9 sm:rounded-lg sm:text-sm",
              "hover:border-border hover:bg-card",
              "focus-visible:border-primary/45 focus-visible:ring-[3px] focus-visible:ring-ring/18",
              !selected && "text-muted-foreground",
              triggerClassName
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
              <CalendarDays className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-start tabular-nums" dir="ltr">
              {selected
                ? format(selected, "EEE, d MMM yyyy · h:mm a", {
                    locale: dateLocale,
                  })
                : (placeholder ?? t("dateTime.pick"))}
            </span>
            <Clock3 className="size-3.5 shrink-0 text-muted-foreground/70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="z-[70] w-[min(calc(100vw-1.25rem),22.5rem)] overflow-hidden rounded-2xl border-border/70 p-0 shadow-xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {showQuickActions ? (
            <div className="border-b border-border/60 bg-muted/25 p-2.5">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-lg text-[12px] font-semibold"
                  onClick={() =>
                    applyQuick(
                      0,
                      Math.max(new Date().getHours() + 1, 9),
                      0
                    )
                  }
                >
                  {t("dateTime.quickToday")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-lg text-[12px] font-semibold"
                  onClick={() => applyQuick(1)}
                >
                  {t("dateTime.quickTomorrow")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-lg text-[12px] font-semibold"
                  onClick={() => applyQuick(2)}
                >
                  {t("dateTime.quickIn2Days")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-lg text-[12px] font-semibold"
                  onClick={() => applyQuick(7)}
                >
                  {t("dateTime.quickIn1Week")}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="px-1 pt-1">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={applyDate}
              defaultMonth={selected ?? new Date()}
              locale={dateLocale}
              disabled={
                disablePast ? { before: addDays(new Date(), -1) } : undefined
              }
            />
          </div>

          <div className="grid gap-2.5 border-t border-border/60 bg-muted/15 p-3">
            <div className="grid gap-1.5">
              <Label
                htmlFor={`${id ?? "dt12"}-time`}
                className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
              >
                {t("dateTime.time")}
              </Label>
              <Time12Input
                id={`${id ?? "dt12"}-time`}
                value={timeValue}
                onChange={applyTime}
                aria-label={t("dateTime.time")}
                className="[&_button]:h-10 [&_button]:rounded-xl sm:[&_button]:h-9 sm:[&_button]:rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              {clearable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg text-muted-foreground"
                  disabled={!value}
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <X className="size-3.5" />
                  {t("dateTime.clear")}
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-lg px-4"
                onClick={() => setOpen(false)}
              >
                {t("dateTime.done")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
