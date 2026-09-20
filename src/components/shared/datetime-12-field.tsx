"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  addDays,
  format,
  isValid,
  parse,
  setHours,
  setMinutes,
  type Locale,
} from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CalendarDays, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function useIsCompactViewport() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(max-width: 639px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(max-width: 639px)").matches
        : false,
    () => false
  );
}

/**
 * Professional Tailwind date+time picker (12-hour clock).
 * Stores `yyyy-MM-ddTHH:mm` for datetime-local compatibility.
 * Mobile: full bottom-sheet panel. Desktop: anchored popover.
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
  const isCompact = useIsCompactViewport();
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

  const displayValue = selected
    ? format(selected, locale === "ar" ? "EEEE، d MMMM yyyy · h:mm a" : "EEE, d MMM yyyy · h:mm a", {
        locale: dateLocale,
      })
    : (placeholder ?? t("dateTime.pick"));

  const pickerPanel = (
    <DateTime12PickerPanel
      id={id}
      selected={selected}
      timeValue={timeValue}
      showQuickActions={showQuickActions}
      clearable={clearable}
      disablePast={disablePast}
      dateLocale={dateLocale}
      value={value}
      onApplyDate={applyDate}
      onApplyTime={applyTime}
      onApplyQuick={applyQuick}
      onClear={() => {
        onChange("");
        setOpen(false);
      }}
      onDone={() => setOpen(false)}
    />
  );

  const trigger = (
    <Button
      id={id}
      type="button"
      variant="outline"
      disabled={disabled}
      aria-label={label ?? placeholder ?? t("dateTime.pick")}
      aria-expanded={open}
      onClick={isCompact ? () => setOpen(true) : undefined}
      className={cn(
        "h-12 w-full min-w-0 justify-start gap-2.5 touch-manipulation rounded-xl border-border/85 bg-card px-3 text-[15px] font-normal shadow-[0_1px_2px_rgba(11,20,36,0.03)] sm:h-10 sm:rounded-lg sm:text-sm",
        "hover:border-border hover:bg-card",
        "focus-visible:border-primary/45 focus-visible:ring-[3px] focus-visible:ring-ring/18",
        !selected && "text-muted-foreground",
        triggerClassName
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground sm:h-7 sm:w-7">
        <CalendarDays className="size-3.5" />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-start",
          selected && "tabular-nums"
        )}
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        {displayValue}
      </span>
      <Clock3 className="size-3.5 shrink-0 text-muted-foreground/70" />
    </Button>
  );

  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      {label ? (
        <Label htmlFor={id} className="text-[13px] leading-snug sm:text-sm">
          {label}
        </Label>
      ) : null}

      {isCompact ? (
        <>
          {trigger}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
              className={cn(
                "z-[80] flex max-h-[min(92dvh,100%)] w-full flex-col gap-0 overflow-hidden p-0",
                "inset-x-[5%] bottom-[max(0.75rem,env(safe-area-inset-bottom))] top-auto max-w-none translate-x-0 translate-y-0",
                "rounded-[1.35rem] border-border/70 shadow-2xl",
                "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                "sm:inset-x-auto"
              )}
              overlayClassName="z-[75] bg-black/55"
            >
              <DialogHeader className="shrink-0 border-b border-border/60 px-4 pb-3 pt-1">
                <DialogTitle className="text-[1.05rem]">
                  {label ?? t("dateTime.pick")}
                </DialogTitle>
              </DialogHeader>
              <DialogBody className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-0">
                {pickerPanel}
              </DialogBody>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            collisionPadding={16}
            className="z-[70] w-[min(calc(100vw-1.25rem),22.5rem)] overflow-hidden rounded-2xl border-border/70 p-0 shadow-xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {pickerPanel}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function DateTime12PickerPanel({
  id,
  selected,
  timeValue,
  showQuickActions,
  clearable,
  disablePast,
  dateLocale,
  value,
  onApplyDate,
  onApplyTime,
  onApplyQuick,
  onClear,
  onDone,
}: {
  id?: string;
  selected: Date | undefined;
  timeValue: string;
  showQuickActions: boolean;
  clearable: boolean;
  disablePast: boolean;
  dateLocale: Locale;
  value: string;
  onApplyDate: (day: Date | undefined) => void;
  onApplyTime: (next: string) => void;
  onApplyQuick: (daysAhead: number, hour?: number, minute?: number) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-col">
      {showQuickActions ? (
        <div className="shrink-0 border-b border-border/60 bg-muted/25 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-11 rounded-xl text-[13px] font-semibold touch-manipulation sm:h-9 sm:rounded-lg sm:text-[12px]"
              onClick={() =>
                onApplyQuick(0, Math.max(new Date().getHours() + 1, 9), 0)
              }
            >
              {t("dateTime.quickToday")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-11 rounded-xl text-[13px] font-semibold touch-manipulation sm:h-9 sm:rounded-lg sm:text-[12px]"
              onClick={() => onApplyQuick(1)}
            >
              {t("dateTime.quickTomorrow")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-11 rounded-xl text-[13px] font-semibold touch-manipulation sm:h-9 sm:rounded-lg sm:text-[12px]"
              onClick={() => onApplyQuick(2)}
            >
              {t("dateTime.quickIn2Days")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-11 rounded-xl text-[13px] font-semibold touch-manipulation sm:h-9 sm:rounded-lg sm:text-[12px]"
              onClick={() => onApplyQuick(7)}
            >
              {t("dateTime.quickIn1Week")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-center px-2 py-1 sm:px-1">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onApplyDate}
          defaultMonth={selected ?? new Date()}
          locale={dateLocale}
          className="mx-auto w-full"
          classNames={{
            weekday: "w-10 text-[0.75rem] font-medium text-muted-foreground sm:w-9",
            day: "relative h-10 w-10 p-0 text-center text-sm sm:h-9 sm:w-9",
            day_button:
              "inline-flex h-10 w-10 items-center justify-center rounded-xl p-0 font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-ring aria-selected:opacity-100 sm:h-9 sm:w-9 sm:rounded-lg",
          }}
          disabled={
            disablePast ? { before: addDays(new Date(), -1) } : undefined
          }
        />
      </div>

      <div className="sticky bottom-0 grid gap-3 border-t border-border/60 bg-card/95 p-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90">
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
            onChange={onApplyTime}
            aria-label={t("dateTime.time")}
            className="[&_button]:h-11 [&_button]:rounded-xl sm:[&_button]:h-9 sm:[&_button]:rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          {clearable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 min-h-11 flex-1 rounded-xl text-muted-foreground touch-manipulation sm:h-9 sm:min-h-9 sm:flex-none"
              disabled={!value}
              onClick={onClear}
            >
              <X className="size-3.5" />
              {t("dateTime.clear")}
            </Button>
          ) : (
            <span className="hidden flex-1 sm:block" />
          )}
          <Button
            type="button"
            size="sm"
            className="h-11 min-h-11 flex-[1.4] rounded-xl px-4 touch-manipulation sm:h-9 sm:min-h-9 sm:flex-none"
            onClick={onDone}
          >
            {t("dateTime.done")}
          </Button>
        </div>
      </div>
    </div>
  );
}
