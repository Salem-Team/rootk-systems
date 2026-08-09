"use client";

import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { CrmStage } from "@/types/crm";

interface CrmStageListItemProps {
  stage: CrmStage;
  index: number;
  count: number;
  busy: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onEdit: (stage: CrmStage) => void;
  onDuplicate: (stage: CrmStage) => void;
  onToggleActive: (stage: CrmStage) => void;
  onDelete: (stage: CrmStage) => void;
}

/** One row in the CRM stages list: reorder, edit, duplicate, toggle, delete. */
export function CrmStageListItem({
  stage,
  index,
  count,
  busy,
  onMove,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: CrmStageListItemProps) {
  const { t } = useTranslation();

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: stage.color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold">{stage.name}</p>
          {!stage.active ? (
            <Badge variant="outline" className="text-[10px]">
              {t("crm.stages.inactive")}
            </Badge>
          ) : null}
          <span className="text-[11px] text-muted-foreground">
            {t(`crm.stageCategory.${stage.category}`)}
          </span>
        </div>
        {stage.description ? (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {stage.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={busy || index === 0}
          onClick={() => onMove(index, -1)}
          aria-label={t("crm.actions.moveUp")}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={busy || index === count - 1}
          onClick={() => onMove(index, 1)}
          aria-label={t("crm.actions.moveDown")}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(stage)}>
          {t("crm.stages.edit")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onDuplicate(stage)}
        >
          <Copy className="me-1 h-3 w-3" />
          {t("crm.actions.duplicate")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onToggleActive(stage)}
        >
          {stage.active ? t("crm.actions.deactivate") : t("crm.actions.activate")}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-rose-700"
          onClick={() => onDelete(stage)}
          aria-label={t("crm.actions.delete")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
