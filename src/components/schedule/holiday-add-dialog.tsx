import { format } from "date-fns";
import type { Locale } from "date-fns";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Holiday } from "@/types";
import type { TranslationPath } from "@/i18n";

interface HolidayAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (value: string) => void;
  date: Date | undefined;
  onDateChange: (value: Date | undefined) => void;
  type: Holiday["type"];
  onTypeChange: (value: Holiday["type"]) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  saving: boolean;
  onSubmit: () => void;
  dateLocale: Locale;
  t: (path: TranslationPath, vars?: Record<string, string | number>) => string;
}

export function HolidayAddDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  date,
  onDateChange,
  type,
  onTypeChange,
  description,
  onDescriptionChange,
  saving,
  onSubmit,
  dateLocale,
  t,
}: HolidayAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          {t("schedule.addHoliday")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("schedule.addHoliday")}</DialogTitle>
          <DialogDescription>{t("schedule.holidaysDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="holiday-name">{t("schedule.holidayName")}</Label>
            <Input
              id="holiday-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("schedule.holidayDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarDays />
                  {date
                    ? format(date, "PPP", { locale: dateLocale })
                    : t("reports.pickDates")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={onDateChange}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>{t("schedule.holidayType")}</Label>
            <Select
              value={type}
              onValueChange={(v) => onTypeChange(v as Holiday["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="holiday">{t("schedule.holiday")}</SelectItem>
                <SelectItem value="event">{t("schedule.event")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-desc">{t("common.description")}</Label>
            <Textarea
              id="holiday-desc"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            {t("schedule.addHoliday")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
