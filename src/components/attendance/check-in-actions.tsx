"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Home, Loader2, LogIn, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AttendanceBurstKind } from "@/components/attendance/attendance-success";
import { useTranslation } from "@/hooks/use-translation";
import { snappySpring, softSpring } from "@/lib/animations";
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

  const wfhToggle =
    canCheckIn && wfhAllowed ? (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between list-row px-3.5 py-3 sm:px-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
            <Home className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <Label htmlFor="wfh-toggle" className="cursor-pointer">
              {t("attendance.wfhMode")}
            </Label>
            <p className="text-xs text-muted-foreground">
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
      </motion.div>
    ) : null;

  const officeGeoHint =
    (canCheckIn && !(wfh && wfhAllowed)) ||
    (canCheckOut && todayRecord?.status !== "wfh") ? (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 list-row px-3.5 py-3 sm:px-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-tight">
            {isCheckingIn || isCheckingOut
              ? t("attendance.locating")
              : t("attendance.officeGeoHint")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("attendance.officeGeoHintDetail")}
          </p>
        </div>
      </motion.div>
    ) : null;

  const actionButtons = (
    <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
      <motion.div
        whileHover={
          reduceMotion || !canCheckIn ? undefined : { scale: 1.01, y: -1 }
        }
        whileTap={reduceMotion || !canCheckIn ? undefined : { scale: 0.98 }}
        transition={snappySpring}
      >
        <Button
          size="xl"
          className={cn(
            "h-12 w-full gap-3 text-base sm:h-14",
            !canCheckIn && "opacity-60"
          )}
          disabled={!canCheckIn || isCheckingIn || !!burst}
          onClick={() => void handleCheckIn()}
          aria-label={t("attendance.checkIn")}
          aria-busy={isCheckingIn}
        >
          {isCheckingIn ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <LogIn className="h-5 w-5" aria-hidden />
          )}
          {isCheckingIn ? t("attendance.checkingIn") : t("attendance.checkIn")}
        </Button>
      </motion.div>

      <motion.div
        whileHover={
          reduceMotion || !canCheckOut ? undefined : { scale: 1.01, y: -1 }
        }
        whileTap={reduceMotion || !canCheckOut ? undefined : { scale: 0.98 }}
        transition={softSpring}
      >
        <Button
          size="xl"
          variant={canCheckOut ? "default" : "outline"}
          className={cn(
            "h-12 w-full gap-3 text-base sm:h-14",
            canCheckOut
              ? "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              : "border-primary/25 hover:bg-primary/8",
            !canCheckOut && "opacity-60"
          )}
          disabled={!canCheckOut || isCheckingOut || !!burst}
          onClick={() => void handleCheckOut()}
          aria-label={t("attendance.checkOut")}
          aria-busy={isCheckingOut}
        >
          {isCheckingOut ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <LogOut className="h-5 w-5" aria-hidden />
          )}
          {isCheckingOut
            ? t("attendance.checkingOut")
            : t("attendance.checkOut")}
        </Button>
      </motion.div>
    </div>
  );

  return (
    <>
      {wfhToggle}
      {officeGeoHint}
      {actionButtons}
    </>
  );
}
