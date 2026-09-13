"use client";

import {
  CheckCircle2,
  Coffee,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export function CheckInStatusList({
  checkInTime,
  checkOutTime,
  hoursDisplay,
  breakDisplay,
  isLive,
  checkedIn,
  checkedOut,
}: {
  checkInTime: string;
  checkOutTime: string;
  hoursDisplay: string;
  breakDisplay: string;
  isLive: boolean;
  checkedIn: boolean;
  checkedOut: boolean;
}) {
  const { t } = useTranslation();

  const rows = [
    {
      key: "in",
      label: t("attendance.checkIn"),
      icon: LogIn,
      tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
      value: checkedIn ? checkInTime : t("attendance.notCheckedInShort"),
      badgeTone: checkedIn ? "success" : "secondary",
      badge: checkedIn
        ? t("attendance.statusDone")
        : t("attendance.notCheckedInShort"),
    },
    {
      key: "out",
      label: t("attendance.checkOut"),
      icon: LogOut,
      tone: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
      value: checkedOut ? checkOutTime : t("attendance.notCheckedOutShort"),
      badgeTone: checkedOut ? "success" : "secondary",
      badge: checkedOut
        ? t("attendance.statusDone")
        : t("attendance.notCheckedOutShort"),
    },
    {
      key: "hours",
      label: t("attendance.workingHours"),
      icon: Timer,
      tone: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
      value: hoursDisplay,
      badgeTone: isLive ? "info" : "secondary",
      badge: isLive ? t("attendance.liveBadge") : null,
      mono: true,
    },
    {
      key: "break",
      label: t("attendance.breakDuration"),
      icon: Coffee,
      tone: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
      value: breakDisplay,
      badgeTone: "secondary",
      badge: null,
      mono: true,
    },
  ] as const;

  return (
    <ul className="flex w-full flex-col gap-2.5">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <li
            key={row.key}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                row.tone
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-muted-foreground">
                {row.label}
              </p>
              <p
                className={cn(
                  "truncate text-[13px] font-semibold tracking-tight",
                  "mono" in row && row.mono && "font-mono tabular-nums"
                )}
              >
                {row.value}
              </p>
            </div>
            {row.badge ? (
              <Badge
                variant={
                  row.badgeTone === "success"
                    ? "success"
                    : row.badgeTone === "info"
                      ? "info"
                      : "secondary"
                }
                className="h-6 shrink-0 gap-1 px-2 text-[10px] font-semibold"
              >
                {row.badgeTone === "success" ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                ) : null}
                {row.badge}
              </Badge>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
