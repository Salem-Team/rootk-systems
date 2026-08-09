"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAVE_TYPES } from "@/constants";
import { createLeaveSchema } from "@/schemas";
import { createLeaveRequest } from "@/services/leave.service";
import { getWorkSchedule } from "@/services/schedule.service";
import { emitLeaveUpdated } from "@/lib/events";
import { getWorkEmployeeId } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import type { LeaveRequest, LeaveType, WorkSchedule } from "@/types";
import { LeaveFormDateRangeField } from "./leave-form-date-range-field";
import { DEFAULT_WORKING_DAYS, workingDaysBetween } from "./leave-form-schedule";

type LeaveFormValues = {
  type: LeaveType;
  reason: string;
  range: { from: Date; to?: Date };
};

interface LeaveFormProps {
  onSuccess?: (request: LeaveRequest) => void;
  onCancel?: () => void;
}

export function LeaveForm({ onSuccess, onCancel }: LeaveFormProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [submitting, setSubmitting] = useState(false);
  const [schedule, setSchedule] = useState<
    Pick<WorkSchedule, "workingDays" | "holidays">
  >({
    workingDays: DEFAULT_WORKING_DAYS,
    holidays: [],
  });

  useEffect(() => {
    let mounted = true;
    void getWorkSchedule().then((res) => {
      if (!mounted || !res.success) return;
      setSchedule({
        workingDays: res.data.workingDays,
        holidays: res.data.holidays,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const leaveSchema = useMemo(
    () =>
      z.object({
        type: z.enum([
          "annual",
          "sick",
          "personal",
          "unpaid",
          "maternity",
          "emergency",
        ] as const),
        reason: z
          .string()
          .min(10, t("validation.reasonMin"))
          .max(500, t("validation.reasonMax")),
        range: z
          .object({
            from: z.date({ required_error: t("validation.startDateRequired") }),
            to: z.date().optional(),
          })
          .refine((r) => !!r.from, { message: t("validation.selectDateRange") }),
      }),
    [t]
  );

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      type: "annual",
      reason: "",
      range: undefined,
    },
  });

  const range = form.watch("range") as DateRange | undefined;
  const days =
    range?.from && range?.to
      ? workingDaysBetween(range.from, range.to, schedule)
      : range?.from
        ? 1
        : 0;

  async function onSubmit(values: LeaveFormValues) {
    const from = values.range.from;
    const to = values.range.to ?? values.range.from;
    const dayCount = workingDaysBetween(from, to, schedule);

    setSubmitting(true);
    try {
      const parsed = createLeaveSchema.safeParse({
        employeeId: getWorkEmployeeId(),
        type: values.type as LeaveType,
        startDate: format(from, "yyyy-MM-dd"),
        endDate: format(to, "yyyy-MM-dd"),
        days: dayCount,
        reason: values.reason.trim(),
      });
      if (!parsed.success) {
        toast.error(t("common.error"));
        return;
      }

      const res = await createLeaveRequest(parsed.data);

      if (!res.success) {
        toast.error(res.message ?? t("common.error"));
        return;
      }

      toast.success(t("leave.submitted"));
      emitLeaveUpdated();
      form.reset({ type: "annual", reason: "", range: undefined });
      onSuccess?.(res.data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label>{t("leave.type")}</Label>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-invalid={!!form.formState.errors.type}>
                <SelectValue placeholder={t("leave.type")} />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((leaveType) => (
                  <SelectItem key={leaveType.value} value={leaveType.value}>
                    {t(`leaveTypes.${leaveType.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.type ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.type.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{t("leave.dateRange")}</Label>
        <Controller
          control={form.control}
          name="range"
          render={({ field }) => (
            <LeaveFormDateRangeField
              value={field.value as DateRange | undefined}
              onChange={field.onChange}
              dateLocale={dateLocale}
              t={t}
            />
          )}
        />
        {form.formState.errors.range ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.range.message ??
              form.formState.errors.range.from?.message}
          </p>
        ) : null}
        {days > 0 ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("leave.daysCount", { count: days })}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="leave-reason">{t("leave.reason")}</Label>
        <Textarea
          id="leave-reason"
          placeholder={t("leave.reasonPlaceholder")}
          rows={4}
          {...form.register("reason")}
          aria-invalid={!!form.formState.errors.reason}
        />
        {form.formState.errors.reason ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.reason.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Send />}
          {t("leave.submitRequest")}
        </Button>
      </div>
    </form>
  );
}
