"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { enUS } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/hooks/use-translation";
import { demoNow } from "@/lib/mock-date";
import { cn } from "@/lib/utils";

export function ReportDateRangeFilter({
  range,
  onChange,
  dateLocale,
}: {
  range?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  dateLocale: typeof enUS;
}) {
  const { t } = useTranslation();
  const [months, setMonths] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setMonths(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
      <Label>{t("reports.dateRange")}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-11 w-full min-w-0 touch-manipulation justify-start font-normal sm:h-10",
              !range?.from && "text-muted-foreground"
            )}
          >
            <CalendarDays className="shrink-0" />
            <span className="truncate">
              {range?.from ? (
                range.to ? (
                  <>
                    {format(range.from, "LLL d", { locale: dateLocale })} –{" "}
                    {format(range.to, "LLL d, y", { locale: dateLocale })}
                  </>
                ) : (
                  format(range.from, "LLL d, y", { locale: dateLocale })
                )
              ) : (
                t("reports.pickDates")
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(100vw-1.5rem,22rem)] max-w-[calc(100vw-1.5rem)] p-0 sm:w-auto sm:max-w-none"
          align="start"
          sideOffset={8}
        >
          <Calendar
            mode="range"
            numberOfMonths={months}
            selected={range}
            onSelect={onChange}
            defaultMonth={range?.from ?? demoNow()}
            locale={dateLocale}
            className="mx-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
