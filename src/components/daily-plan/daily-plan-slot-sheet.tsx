"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import type { DailyPlanSlot, DailyPlanSlotInput } from "@/types/daily-plan";

export function DailyPlanSlotSheet({
  open,
  onOpenChange,
  editing,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DailyPlanSlot | null;
  busy: boolean;
  onSave: (input: DailyPlanSlotInput) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setStartTime(editing?.startTime ?? "09:00");
    setEndTime(editing?.endTime ?? "10:00");
  }, [open, editing]);

  const canSave = title.trim().length >= 2 && !!startTime && !!endTime;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto px-4 sm:max-w-md sm:px-6">
        <SheetHeader>
          <SheetTitle>
            {editing ? t("dailyPlan.editBlock") : t("dailyPlan.addBlock")}
          </SheetTitle>
          <SheetDescription>{t("dailyPlan.blockDesc")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid flex-1 gap-4 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="dp-title">{t("dailyPlan.fieldTitle")}</Label>
            <Input
              id="dp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("dailyPlan.titlePlaceholder")}
              className="h-11 text-base sm:h-9 sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dp-start">{t("dailyPlan.fieldStart")}</Label>
              <Input
                id="dp-start"
                type="time"
                step={60}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 text-base sm:h-9 sm:text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dp-end">{t("dailyPlan.fieldEnd")}</Label>
              <Input
                id="dp-end"
                type="time"
                step={60}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11 text-base sm:h-9 sm:text-sm"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dp-desc">{t("common.description")}</Label>
            <Textarea
              id="dp-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dailyPlan.descPlaceholder")}
              className="min-h-[5.5rem] text-base sm:text-sm"
            />
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 mt-auto grid grid-cols-2 gap-2 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur-md sm:static sm:-mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-2 sm:pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 sm:h-9"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="h-11 sm:h-9"
            disabled={!canSave || busy}
            onClick={() =>
              onSave({
                id: editing?.id,
                title: title.trim(),
                description: description.trim(),
                startTime,
                endTime,
              })
            }
          >
            {busy ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
