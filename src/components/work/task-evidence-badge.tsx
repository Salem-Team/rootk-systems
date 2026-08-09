"use client";

import { FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { resolveEvidenceBadgeState } from "@/lib/task-evidence";
import { cn } from "@/lib/utils";
import type { WorkTask } from "@/types/work";

export function TaskEvidenceBadge({
  task,
  className,
}: {
  task: WorkTask;
  className?: string;
}) {
  const { t } = useTranslation();
  const state = resolveEvidenceBadgeState(task);
  if (state === "none") return null;

  return (
    <Badge
      variant={state === "submitted" ? "success" : "warning"}
      className={cn("h-5 gap-1", className)}
    >
      <FileCheck2 className="h-3 w-3" aria-hidden />
      {state === "submitted"
        ? t("workAdmin.evidenceBadgeDone")
        : t("workAdmin.evidenceBadge")}
    </Badge>
  );
}
