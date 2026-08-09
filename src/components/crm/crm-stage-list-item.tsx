"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { CrmStage, CrmSubStage } from "@/types/crm";

interface CrmStageListItemProps {
  stage: CrmStage;
  index: number;
  count: number;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: (stageId: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onEdit: (stage: CrmStage) => void;
  onDuplicate: (stage: CrmStage) => void;
  onToggleActive: (stage: CrmStage) => void;
  onDelete: (stage: CrmStage) => void;
  onAddSub: (stage: CrmStage) => void;
  onEditSub: (sub: CrmSubStage) => void;
  onToggleSubActive: (sub: CrmSubStage) => void;
  onMoveSub: (stageId: string, index: number, dir: -1 | 1) => void;
  onDeleteSub: (sub: CrmSubStage) => void;
}

/** One row in the CRM stages list with nested sub-stage management. */
export function CrmStageListItem({
  stage,
  index,
  count,
  busy,
  expanded,
  onToggleExpand,
  onMove,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  onAddSub,
  onEditSub,
  onToggleSubActive,
  onMoveSub,
  onDeleteSub,
}: CrmStageListItemProps) {
  const { t } = useTranslation();
  const subs = [...(stage.subStages ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <li className="px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-3">
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
            <span className="text-[11px] text-muted-foreground">
              {t("crm.stages.subCount", { count: String(subs.length) })}
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
            size="sm"
            variant="outline"
            onClick={() => onToggleExpand(stage.id)}
          >
            {expanded ? (
              <ChevronUp className="me-1 h-3 w-3" />
            ) : (
              <ChevronDown className="me-1 h-3 w-3" />
            )}
            {t("crm.stages.subStages")}
          </Button>
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
      </div>

      {expanded ? (
        <div className="mt-3 ms-5 rounded-xl border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
            <p className="text-[12px] font-medium text-muted-foreground">
              {t("crm.stages.subStages")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onAddSub(stage)}
            >
              <Plus className="me-1 h-3 w-3" />
              {t("crm.stages.addSub")}
            </Button>
          </div>
          {subs.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-muted-foreground">
              {t("crm.empty.subStages")}
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {subs.map((sub, subIndex) => (
                <li
                  key={sub.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12px] font-semibold">{sub.name}</p>
                      {!sub.active ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t("crm.stages.inactive")}
                        </Badge>
                      ) : null}
                    </div>
                    {sub.description ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {sub.description}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={busy || subIndex === 0}
                    onClick={() => onMoveSub(stage.id, subIndex, -1)}
                    aria-label={t("crm.actions.moveUp")}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={busy || subIndex === subs.length - 1}
                    onClick={() => onMoveSub(stage.id, subIndex, 1)}
                    aria-label={t("crm.actions.moveDown")}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEditSub(sub)}
                  >
                    {t("crm.stages.edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onToggleSubActive(sub)}
                  >
                    {sub.active
                      ? t("crm.actions.deactivate")
                      : t("crm.actions.activate")}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-rose-700"
                    disabled={busy}
                    onClick={() => onDeleteSub(sub)}
                    aria-label={t("crm.actions.delete")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}
