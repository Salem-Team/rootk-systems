import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import { motion } from "framer-motion";
import { CalendarDays, Loader2, PartyPopper, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fadeInUp } from "@/lib/animations";
import {
  holidayDescKey,
  holidayNameKey,
  translateOrFallback,
} from "@/lib/i18n-content";
import { cn } from "@/lib/utils";
import type { Holiday } from "@/types";
import type { TranslationPath } from "@/i18n";

export function HolidayListItem({
  holiday,
  readOnly,
  removing,
  onRemove,
  dateLocale,
  t,
}: {
  holiday: Holiday;
  readOnly: boolean;
  removing: boolean;
  onRemove: (id: string) => void;
  dateLocale: Locale;
  t: (path: TranslationPath, vars?: Record<string, string | number>) => string;
}) {
  return (
    <motion.li
      variants={fadeInUp}
      className="group list-row flex items-start justify-between gap-4 px-3.5 py-3"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            holiday.type === "holiday"
              ? "border border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100"
              : "border border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100"
          )}
        >
          {holiday.type === "holiday" ? (
            <CalendarDays className="h-4 w-4" />
          ) : (
            <PartyPopper className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">
              {translateOrFallback(t, holidayNameKey(holiday.id), holiday.name)}
            </p>
            <Badge
              variant="outline"
              className={cn(
                holiday.type === "holiday"
                  ? "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100"
                  : "border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100"
              )}
            >
              {holiday.type === "holiday"
                ? t("schedule.holiday")
                : t("schedule.event")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(parseISO(holiday.date), "EEEE, MMM d, yyyy", {
              locale: dateLocale,
            })}
          </p>
          {holiday.description ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {translateOrFallback(
                t,
                holidayDescKey(holiday.id),
                holiday.description
              )}
            </p>
          ) : null}
        </div>
      </div>
      {readOnly ? null : (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(holiday.id)}
          disabled={removing}
          aria-label={t("schedule.remove")}
        >
          {removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      )}
    </motion.li>
  );
}
