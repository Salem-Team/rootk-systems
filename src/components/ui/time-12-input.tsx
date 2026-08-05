"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import {
  compose12ToHm,
  parseHmTo12,
  type ClockPeriod,
} from "@/lib/format-time";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface Time12InputProps {
  id?: string;
  value: string;
  onChange: (hm: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** 12-hour time control; value/onChange use stored HH:mm (24h). */
export function Time12Input({
  id,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: Time12InputProps) {
  const { t } = useTranslation();
  const parts = useMemo(() => parseHmTo12(value || "09:00"), [value]);

  function emit(next: {
    hour12?: number;
    minute?: number;
    period?: ClockPeriod;
  }) {
    onChange(
      compose12ToHm(
        next.hour12 ?? parts.hour12,
        next.minute ?? parts.minute,
        next.period ?? parts.period
      )
    );
  }

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5", className)}
    >
      <Select
        value={String(parts.hour12)}
        disabled={disabled}
        onValueChange={(v) => emit({ hour12: Number(v) })}
      >
        <SelectTrigger className="h-9 font-mono tabular-nums" aria-label="Hour">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)} className="font-mono">
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(parts.minute)}
        disabled={disabled}
        onValueChange={(v) => emit({ minute: Number(v) })}
      >
        <SelectTrigger
          className="h-9 font-mono tabular-nums"
          aria-label="Minute"
        >
          <SelectValue>
            {String(parts.minute).padStart(2, "0")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)} className="font-mono">
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={parts.period}
        disabled={disabled}
        onValueChange={(v) => emit({ period: v as ClockPeriod })}
      >
        <SelectTrigger className="h-9 min-w-[3.75rem]" aria-label="AM/PM">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">{t("common.am")}</SelectItem>
          <SelectItem value="PM">{t("common.pm")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
