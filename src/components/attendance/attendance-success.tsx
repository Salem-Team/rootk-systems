"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, LogIn, LogOut } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { softSpring } from "@/lib/animations";

export type AttendanceBurstKind = "check-in" | "check-out" | null;

interface AttendanceSuccessProps {
  kind: AttendanceBurstKind;
  onDone: () => void;
}

const SPARKS = Array.from({ length: 10 }, (_, i) => i);

export function AttendanceSuccess({ kind, onDone }: AttendanceSuccessProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!kind) return;
    const id = window.setTimeout(onDone, reduceMotion ? 900 : 2200);
    return () => window.clearTimeout(id);
  }, [kind, onDone, reduceMotion]);

  const isIn = kind === "check-in";
  const Icon = isIn ? LogIn : LogOut;

  return (
    <AnimatePresence>
      {kind ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {!reduceMotion
            ? SPARKS.map((spark) => {
                const angle = (spark / SPARKS.length) * Math.PI * 2;
                const distance = 72 + (spark % 3) * 18;
                return (
                  <motion.span
                    key={spark}
                    aria-hidden
                    className="absolute h-1.5 w-1.5 rounded-full bg-primary"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                    animate={{
                      x: Math.cos(angle) * distance,
                      y: Math.sin(angle) * distance,
                      opacity: [0, 1, 0],
                      scale: [0.4, 1.2, 0.2],
                    }}
                    transition={{
                      duration: 1.1,
                      delay: 0.08 + spark * 0.03,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                );
              })
            : null}

          <motion.div
            className="relative flex flex-col items-center gap-3 px-6 text-center"
            initial={{ scale: 0.86, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={softSpring}
          >
            <div className="relative">
              {!reduceMotion ? (
                <>
                  <motion.span
                    aria-hidden
                    className="absolute inset-[-10px] rounded-full border-2 border-primary/40"
                    initial={{ scale: 0.7, opacity: 0.8 }}
                    animate={{ scale: 1.55, opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                  <motion.span
                    aria-hidden
                    className="absolute inset-[-10px] rounded-full border border-sky-400/50"
                    initial={{ scale: 0.8, opacity: 0.7 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    transition={{ duration: 1.35, delay: 0.08, ease: "easeOut" }}
                  />
                </>
              ) : null}
              <motion.div
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                initial={{ rotate: -8, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={softSpring}
              >
                <Icon className="h-7 w-7" />
              </motion.div>
              <motion.span
                className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...softSpring, delay: 0.15 }}
              >
                <CheckCircle2 className="h-4 w-4" />
              </motion.span>
            </div>

            <div>
              <p className="text-lg font-semibold tracking-tight">
                {isIn
                  ? t("attendance.celebrateCheckIn")
                  : t("attendance.celebrateCheckOut")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isIn
                  ? t("attendance.celebrateCheckInDesc")
                  : t("attendance.celebrateCheckOutDesc")}
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
