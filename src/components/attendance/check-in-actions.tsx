"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Home, Loader2, LogIn, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AttendanceBurstKind } from "@/components/attendance/attendance-success";
import { useTranslation } from "@/hooks/use-translation";
import { snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

export function CheckInActions({
  canCheckIn,
  canCheckOut,
  wfhAllowed,
  wfh,
  setWfh,
  isCheckingIn,
  isCheckingOut,
  burst,
  todayRecord,
  handleCheckIn,
  handleCheckOut,
}: {
  canCheckIn: boolean;
  canCheckOut: boolean;
  wfhAllowed: boolean;
  wfh: boolean;
  setWfh: (value: boolean) => void;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  burst: AttendanceBurstKind;
  todayRecord: AttendanceRecord | null;
  handleCheckIn: () => void | Promise<void>;
  handleCheckOut: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-3">
      {canCheckIn && wfhAllowed ? (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/12 text-sky-600 dark:text-sky-400">
              <Home className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <Label htmlFor="wfh-toggle" className="cursor-pointer text-[13px]">
                {t("attendance.wfhMode")}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {t("attendance.wfhHint")}
              </p>
            </div>
          </div>
          <Switch
            id="wfh-toggle"
            checked={wfh}
            onCheckedChange={setWfh}
            aria-label={t("attendance.wfhMode")}
          />
        </div>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        <motion.div
          whileHover={
            reduceMotion || !canCheckIn ? undefined : { y: -1, scale: 1.01 }
          }
          whileTap={reduceMotion || !canCheckIn ? undefined : { scale: 0.98 }}
          transition={snappySpring}
        >
          <Button
            size="xl"
            className={cn(
              "h-auto min-h-[3.75rem] w-full flex-col items-start gap-0.5 px-4 py-3.5 text-start touch-manipulation sm:min-h-14",
              "bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.28)]",
              "hover:bg-emerald-700 hover:shadow-[0_10px_24px_rgba(5,150,105,0.32)]",
              "disabled:opacity-50"
            )}
            disabled={!canCheckIn || isCheckingIn || !!burst}
            onClick={() => void handleCheckIn()}
            aria-label={t("attendance.checkIn")}
            aria-busy={isCheckingIn}
          >
            <span className="flex w-full items-center gap-2.5 text-base font-semibold">
              {isCheckingIn ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <LogIn className="h-5 w-5" aria-hidden />
              )}
              {isCheckingIn
                ? t("attendance.checkingIn")
                : t("attendance.checkIn")}
            </span>
            <span className="ps-7 text-[11px] font-normal text-white/80">
              {t("attendance.checkInHint")}
            </span>
          </Button>
        </motion.div>

        <motion.div
          whileHover={
            reduceMotion || !canCheckOut ? undefined : { y: -1, scale: 1.01 }
          }
          whileTap={reduceMotion || !canCheckOut ? undefined : { scale: 0.98 }}
          transition={snappySpring}
        >
          <Button
            size="xl"
            variant="outline"
            className={cn(
              "h-auto min-h-[3.75rem] w-full flex-col items-start gap-0.5 border-border/80 bg-card px-4 py-3.5 text-start touch-manipulation sm:min-h-14",
              canCheckOut &&
                "border-rose-200 hover:border-rose-300 hover:bg-rose-50/80 dark:border-rose-900 dark:hover:bg-rose-950/40",
              "disabled:opacity-50"
            )}
            disabled={!canCheckOut || isCheckingOut || !!burst}
            onClick={() => void handleCheckOut()}
            aria-label={t("attendance.checkOut")}
            aria-busy={isCheckingOut}
          >
            <span
              className={cn(
                "flex w-full items-center gap-2.5 text-base font-semibold",
                canCheckOut && "text-rose-700 dark:text-rose-300"
              )}
            >
              {isCheckingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <LogOut className="h-5 w-5" aria-hidden />
              )}
              {isCheckingOut
                ? t("attendance.checkingOut")
                : t("attendance.checkOut")}
            </span>
            <span className="ps-7 text-[11px] font-normal text-muted-foreground">
              {t("attendance.checkOutHint")}
            </span>
          </Button>
        </motion.div>
      </div>

      {(canCheckIn && !(wfh && wfhAllowed)) ||
      (canCheckOut && todayRecord?.status !== "wfh") ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200/80 bg-sky-50/80 px-3.5 py-2.5 dark:border-sky-900 dark:bg-sky-950/40">
          <MapPin
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-sky-900 dark:text-sky-100">
              {isCheckingIn || isCheckingOut
                ? t("attendance.locating")
                : t("attendance.atOfficeBanner")}
            </p>
            <p className="mt-0.5 text-[11px] text-sky-800/80 dark:text-sky-200/70">
              {t("attendance.locationVerifiedHint")}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
