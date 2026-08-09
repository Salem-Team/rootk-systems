"use client";

import { CalendarPlus, ListPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { WorkMeeting, WorkTask } from "@/types/work";

export function EmployeeComposerTriggers({
  onAddTask,
  onAddMeeting,
  className,
  disabled = false,
}: {
  onAddTask: () => void;
  onAddMeeting: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "relative z-10 flex flex-col gap-2 sm:flex-row sm:flex-wrap",
        className
      )}
    >
      <Button
        type="button"
        size="default"
        disabled={disabled}
        onClick={onAddTask}
        aria-label={t("workHub.addPersonalTask")}
        className={cn(
          "h-10 w-full gap-2 rounded-xl px-4 text-[13px] font-semibold sm:w-auto",
          "border border-white/20 bg-white text-[#082868]",
          "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
          "hover:bg-white/95 hover:text-[#061c4a]",
          "focus-visible:ring-white/40 focus-visible:ring-offset-[#082868]",
          "disabled:opacity-50"
        )}
      >
        <ListPlus className="h-4 w-4" aria-hidden />
        {t("workHub.addPersonalTask")}
      </Button>
      <Button
        type="button"
        size="default"
        disabled={disabled}
        onClick={onAddMeeting}
        aria-label={t("workHub.addPersonalMeeting")}
        className={cn(
          "h-10 w-full gap-2 rounded-xl px-4 text-[13px] font-semibold sm:w-auto",
          "border-2 border-white/70 bg-transparent text-white",
          "shadow-none",
          "hover:border-white hover:bg-white/15 hover:text-white",
          "focus-visible:ring-white/40 focus-visible:ring-offset-[#082868]",
          "disabled:opacity-50"
        )}
      >
        <CalendarPlus className="h-4 w-4" aria-hidden />
        {t("workHub.addPersonalMeeting")}
      </Button>
    </div>
  );
}

export function OriginBadge({
  origin,
}: {
  origin?: WorkTask["origin"] | WorkMeeting["origin"];
}) {
  const { t } = useTranslation();
  const isPersonal = (origin ?? "assigned") === "personal";
  return (
    <Badge
      variant={isPersonal ? "secondary" : "info"}
      className="h-5 font-medium"
    >
      {isPersonal ? t("workHub.originPersonal") : t("workHub.originAssigned")}
    </Badge>
  );
}
