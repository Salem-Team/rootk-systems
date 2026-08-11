"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import type { BulkAction } from "@/hooks/use-crm-leads-panel";
import type { Employee } from "@/types";
import type { CrmLeadStatus, CrmStage } from "@/types/crm";

const STATUSES: CrmLeadStatus[] = ["active", "inactive", "archived"];

interface CrmLeadsBulkBarProps {
  selectedCount: number;
  stages: CrmStage[];
  employees: Employee[];
  canAssign: boolean;
  busy: boolean;
  bulkAction: BulkAction | "";
  bulkValue: string;
  archiveOpen: boolean;
  onBulkActionChange: (action: BulkAction | "") => void;
  onBulkValueChange: (value: string) => void;
  onArchiveOpenChange: (open: boolean) => void;
  onApply: () => void;
  onConfirmArchive: () => void;
}

/** Bulk-action toolbar shown when leads are selected, plus archive confirm dialog. */
export function CrmLeadsBulkBar({
  selectedCount,
  stages,
  employees,
  canAssign,
  busy,
  bulkAction,
  bulkValue,
  archiveOpen,
  onBulkActionChange,
  onBulkValueChange,
  onArchiveOpenChange,
  onApply,
  onConfirmArchive,
}: CrmLeadsBulkBarProps) {
  const { t } = useTranslation();

  return (
    <>
      {selectedCount > 0 ? (
        <div className="filter-toolbar items-center border-b border-border/60 bg-muted/30 px-3 py-2.5">
          <span className="text-[12px] font-medium text-muted-foreground">
            {t("crm.actions.selected", { count: String(selectedCount) })}
          </span>
          <Select
            value={bulkAction || "none"}
            onValueChange={(v) => {
              onBulkActionChange(v === "none" ? "" : (v as BulkAction));
              onBulkValueChange("");
            }}
          >
            <SelectTrigger className="filter-control h-9 sm:h-8 sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {canAssign ? (
                <SelectItem value="assign">{t("crm.actions.assign")}</SelectItem>
              ) : null}
              <SelectItem value="change_stage">
                {t("crm.actions.changeStage")}
              </SelectItem>
              <SelectItem value="change_status">
                {t("crm.actions.changeStatus")}
              </SelectItem>
              <SelectItem value="archive">{t("crm.actions.archive")}</SelectItem>
            </SelectContent>
          </Select>

          {bulkAction === "assign" ? (
            <Select value={bulkValue || "none"} onValueChange={onBulkValueChange}>
              <SelectTrigger className="filter-control h-9 sm:h-8 sm:w-[160px]">
                <SelectValue placeholder={t("crm.leadForm.selectOwner")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("crm.leads.unassigned")}</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {bulkAction === "change_stage" ? (
            <Select
              value={bulkValue || undefined}
              onValueChange={onBulkValueChange}
            >
              <SelectTrigger className="filter-control h-9 sm:h-8 sm:w-[150px]">
                <SelectValue placeholder={t("crm.leadForm.selectStage")} />
              </SelectTrigger>
              <SelectContent>
                {stages
                  .filter((s) => s.active)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : null}

          {bulkAction === "change_status" ? (
            <Select
              value={bulkValue || undefined}
              onValueChange={onBulkValueChange}
            >
              <SelectTrigger className="filter-control h-9 sm:h-8 sm:w-[140px]">
                <SelectValue placeholder={t("crm.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`crm.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Button
            type="button"
            size="sm"
            disabled={busy || !bulkAction}
            onClick={onApply}
          >
            {t("crm.actions.apply")}
          </Button>
        </div>
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={onArchiveOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("crm.actions.confirmArchive")}</DialogTitle>
            <DialogDescription>
              {t("crm.actions.confirmArchiveDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onArchiveOpenChange(false)}
            >
              {t("crm.actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={onConfirmArchive}
            >
              {t("crm.actions.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
