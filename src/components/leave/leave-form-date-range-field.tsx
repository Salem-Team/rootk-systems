import { format } from "date-fns";
import type { Locale } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { demoNow } from "@/lib/mock-date";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";

export function LeaveFormDateRangeField({
  value,
  onChange,
  dateLocale,
  t,
}: {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  dateLocale: Locale;
  t: (path: TranslationPath, vars?: Record<string, string | number>) => string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            !value?.from && "text-muted-foreground"
          )}
        >
          <CalendarDays />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "LLL d, y", { locale: dateLocale })} –{" "}
                {format(value.to, "LLL d, y", { locale: dateLocale })}
              </>
            ) : (
              format(value.from, "LLL d, y", { locale: dateLocale })
            )
          ) : (
            t("reports.pickDates")
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={(next) => onChange(next)}
          defaultMonth={value?.from ?? demoNow()}
          locale={dateLocale}
        />
      </PopoverContent>
    </Popover>
  );
}
