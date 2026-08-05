"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function OpsWidget({
  id,
  title,
  description,
  children,
  className,
  defaultOpen = true,
  actions,
  movable = false,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  /** Admin dashboard builder chrome — off by default for employee widgets */
  movable?: boolean;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.section
      layout={!reduceMotion}
      variants={fadeInUp}
      initial={false}
      animate="visible"
      className={cn("surface-panel overflow-hidden", className)}
      aria-labelledby={`ops-widget-${id}`}
    >
      <div className="panel-header flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {movable ? (
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/28 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={t("ops.moveWidget")}
                onClick={() => toast.message(t("ops.moveUiOnly"))}
              >
                <GripVertical className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
            <h3
              id={`ops-widget-${id}`}
              className="font-display text-[0.95rem] font-semibold tracking-tight"
            >
              {title}
            </h3>
          </div>
          {description ? (
            <p
              className={cn(
                "mt-0.5 text-sm text-muted-foreground",
                movable && "ps-7"
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-expanded={open}
            aria-controls={`ops-widget-body-${id}`}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open ? "rotate-0" : "-rotate-90"
              )}
              aria-hidden
            />
            <span className="sr-only">
              {open ? t("ops.collapse") : t("ops.expand")}
            </span>
          </Button>
        </div>
      </div>
      {open ? (
        <div id={`ops-widget-body-${id}`} className="panel-body">
          {children}
        </div>
      ) : null}
    </motion.section>
  );
}
