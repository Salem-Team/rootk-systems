"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { addHoliday, removeHoliday } from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import { staggerContainer } from "@/lib/animations";
import type { Holiday } from "@/types";
import { HolidayAddDialog } from "./holiday-add-dialog";
import { HolidayListItem } from "./holiday-list-item";

interface HolidaysListProps {
  holidays: Holiday[];
  onChanged?: (holidays: Holiday[]) => void;
  readOnly?: boolean;
}

export function HolidaysList({
  holidays,
  onChanged,
  readOnly = false,
}: HolidaysListProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [type, setType] = useState<Holiday["type"]>("holiday");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays]
  );

  function resetForm() {
    setName("");
    setDate(undefined);
    setType("holiday");
    setDescription("");
  }

  async function handleAdd() {
    if (!name.trim() || !date) {
      toast.error(t("common.error"));
      return;
    }

    setSaving(true);
    try {
      const res = await addHoliday({
        id: `${type === "holiday" ? "hol" : "evt"}-${Date.now()}`,
        name: name.trim(),
        date: format(date, "yyyy-MM-dd"),
        type,
        description: description.trim() || undefined,
      });
      if (!res.success) {
        toast.error(t("common.error"));
        return;
      }
      toast.success(t("schedule.holidayAdded"));
      onChanged?.([...holidays, res.data].sort((a, b) => a.date.localeCompare(b.date)));
      resetForm();
      setOpen(false);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      const res = await removeHoliday(id);
      if (!res.success) {
        toast.error(t("common.error"));
        return;
      }
      toast.success(t("schedule.holidayRemoved"));
      onChanged?.(holidays.filter((h) => h.id !== id));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <h3 className="text-[0.95rem] font-semibold">{t("schedule.holidays")}</h3>
          <p className="text-sm text-muted-foreground">{t("schedule.holidaysDesc")}</p>
        </div>
        {readOnly ? null : (
          <HolidayAddDialog
            open={open}
            onOpenChange={setOpen}
            name={name}
            onNameChange={setName}
            date={date}
            onDateChange={setDate}
            type={type}
            onTypeChange={setType}
            description={description}
            onDescriptionChange={setDescription}
            saving={saving}
            onSubmit={handleAdd}
            dateLocale={dateLocale}
            t={t}
          />
        )}
      </div>
      <div>
        {sorted.length === 0 ? (
          <EmptyState
            compact
            icon={PartyPopper}
            title={t("schedule.emptyHolidays")}
            description={t("schedule.holidaysDesc")}
            actionLabel={readOnly ? undefined : t("schedule.addHoliday")}
            onAction={readOnly ? undefined : () => setOpen(true)}
          />
        ) : (
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {sorted.map((holiday) => (
              <HolidayListItem
                key={holiday.id}
                holiday={holiday}
                readOnly={readOnly}
                removing={removingId === holiday.id}
                onRemove={handleRemove}
                dateLocale={dateLocale}
                t={t}
              />
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  );
}
