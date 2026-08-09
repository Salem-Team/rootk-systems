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

  return (
    <div className="space-y-2">
      <Label>{t("reports.dateRange")}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 w-full justify-start font-normal",
              !range?.from && "text-muted-foreground"
            )}
          >
            <CalendarDays />
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
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={onChange}
            defaultMonth={range?.from ?? demoNow()}
            locale={dateLocale}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
