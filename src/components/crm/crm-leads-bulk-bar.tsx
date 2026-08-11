"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  CircleDot,
  Layers,
  Loader2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/use-translation";
import { snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import type { Employee } from "@/types";
import type { CrmLeadStatus, CrmStage } from "@/types/crm";

const STATUSES: CrmLeadStatus[] = ["active", "inactive", "archived"];

interface CrmLeadsBulkBarProps {
  selectedCount: number;
  stages: CrmStage[];
  employees: Employee[];
  canAssign: boolean;
  busy: boolean;
  onAssign: (ownerEmployeeId: string) => void;
  onChangeStage: (stageId: string) => void;
  onChangeStatus: (status: CrmLeadStatus) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}

const actionBtn =
  "h-8 gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-white/90 shadow-none hover:bg-white/12 hover:text-white";

/** Fixed floating bulk-action bar for selected CRM leads. */
export function CrmLeadsBulkBar({
  selectedCount,
  stages,
  employees,
  canAssign,
  busy,
  onAssign,
  onChangeStage,
  onChangeStatus,
  onArchive,
  onDelete,
  onClear,
}: CrmLeadsBulkBarProps) {
  const { t } = useTranslation();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const [mounted, setMounted] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (selectedCount === 0) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (archiveOpen || deleteOpen) return;
      onClear();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedCount, archiveOpen, deleteOpen, onClear]);

  const bar = (
    <AnimatePresence>
      {selectedCount > 0 ? (
        <motion.div
          key="crm-leads-bulk-bar"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={snappySpring}
          className={cn(
            "pointer-events-none fixed inset-x-0 bottom-[5.5rem] z-40 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] lg:bottom-6",
            sidebarCollapsed ? "lg:ps-[72px]" : "lg:ps-[252px]"
          )}
        >
          <div
            role="toolbar"
            aria-label={t("crm.actions.selected", {
              count: String(selectedCount),
            })}
            className="pointer-events-auto flex w-full max-w-3xl items-center gap-1 rounded-2xl border border-white/10 bg-[#082868] px-2 py-1.5 text-white shadow-[var(--shadow-float)] lg:w-auto dark:border-white/12 dark:bg-[#071a42]"
          >
            <div className="flex shrink-0 items-center gap-2 ps-1 pe-1">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white/15 px-2 text-[12px] font-semibold tabular-nums">
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  selectedCount
                )}
              </span>
              <span className="hidden text-[12px] font-medium text-white/70 sm:inline">
                {t("crm.actions.selectedNoun")}
              </span>
            </div>

            <span className="mx-0.5 hidden h-6 w-px bg-white/15 sm:block" />

            <div className="scroll-x flex min-w-0 flex-1 items-center gap-0.5 sm:flex-none">
              {canAssign ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      className={actionBtn}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {t("crm.actions.assign")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" side="top" className="min-w-48">
                    <DropdownMenuItem onSelect={() => onAssign("")}>
                      {t("crm.leads.unassigned")}
                    </DropdownMenuItem>
                    {employees.map((employee) => (
                      <DropdownMenuItem
                        key={employee.id}
                        onSelect={() => onAssign(employee.id)}
                      >
                        {employee.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    className={actionBtn}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    {t("crm.actions.changeStage")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="min-w-44">
                  {stages
                    .filter((stage) => stage.active)
                    .map((stage) => (
                      <DropdownMenuItem
                        key={stage.id}
                        onSelect={() => onChangeStage(stage.id)}
                      >
                        {stage.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    className={actionBtn}
                  >
                    <CircleDot className="h-3.5 w-3.5" />
                    {t("crm.actions.changeStatus")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="min-w-36">
                  {STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onSelect={() => onChangeStatus(status)}
                    >
                      {t(`crm.status.${status}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                className={actionBtn}
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="h-3.5 w-3.5" />
                {t("crm.actions.archive")}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                className={cn(
                  actionBtn,
                  "text-red-200 hover:bg-red-500/20 hover:text-red-100"
                )}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("crm.actions.delete")}
              </Button>
            </div>

            <span className="mx-0.5 hidden h-6 w-px bg-white/15 sm:block" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              className="h-8 w-8 shrink-0 rounded-lg text-white/70 hover:bg-white/12 hover:text-white"
              onClick={onClear}
              aria-label={t("crm.actions.clearSelection")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      {mounted ? createPortal(bar, document.body) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
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
              onClick={() => setArchiveOpen(false)}
            >
              {t("crm.actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                setArchiveOpen(false);
                onArchive();
              }}
            >
              {t("crm.actions.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("crm.actions.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("crm.actions.confirmDeleteDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              {t("crm.actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                setDeleteOpen(false);
                onDelete();
              }}
            >
              {t("crm.actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
