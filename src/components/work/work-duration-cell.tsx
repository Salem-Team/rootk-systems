"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Timer } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import {
  formatDurationMs,
  taskAssignedAt,
  taskDurationMs,
} from "@/lib/work-duration";
import { snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { WorkTask } from "@/types/work";

function liveElapsedMs(task: Pick<WorkTask, "assignedAt" | "createdAt">) {
  const start = Date.parse(taskAssignedAt(task));
  if (!Number.isFinite(start)) return null;
  return Math.max(0, Date.now() - start);
}

/** Compact assign→done (or live elapsed) duration chip with subtle motion. */
export function WorkDurationCell({
  task,
  className,
}: {
  task: WorkTask;
  className?: string;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const done = task.status === "completed";
  const [elapsed, setElapsed] = useState(() =>
    done ? taskDurationMs(task) : liveElapsedMs(task)
  );

  useEffect(() => {
    if (done) {
      setElapsed(taskDurationMs(task));
      return;
    }
    setElapsed(liveElapsedMs(task));
    const id = window.setInterval(() => {
      setElapsed(liveElapsedMs(task));
    }, 30_000);
    return () => window.clearInterval(id);
  }, [done, task]);

  const label = formatDurationMs(elapsed, t);

  return (
    <motion.span
      key={`${task.id}-${done ? "done" : "open"}-${label}`}
      initial={reduceMotion ? false : { y: 4, opacity: 0.01, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={snappySpring}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums",
        done
          ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
          : "bg-muted/70 text-muted-foreground ring-1 ring-border/60",
        className
      )}
      title={
        done ? t("workDuration.tookTitle") : t("workDuration.elapsedTitle")
      }
    >
      <motion.span
        animate={
          reduceMotion || done
            ? undefined
            : { rotate: [0, -12, 12, 0] }
        }
        transition={
          reduceMotion || done
            ? undefined
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }
        }
        className="inline-flex"
      >
        <Timer className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      </motion.span>
      <span>
        {done ? t("workDuration.took", { duration: label }) : label}
      </span>
    </motion.span>
  );
}
