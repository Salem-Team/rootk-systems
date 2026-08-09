"use client";

import { Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { CrmStageDeleteDialog } from "@/components/crm/crm-stage-delete-dialog";
import { CrmStageFormSheet } from "@/components/crm/crm-stage-form-sheet";
import { CrmStageListItem } from "@/components/crm/crm-stage-list-item";
import { CrmSubStageFormSheet } from "@/components/crm/crm-sub-stage-form-sheet";
import { useCrmStagesPanel } from "@/hooks/use-crm-stages-panel";

/** Admin stage management with nested sub-stages, reorder, and safe delete. */
export function CrmStagesPanel({ className }: { className?: string }) {
  const panel = useCrmStagesPanel();
  const { t } = panel;
  const activeStageName = panel.sorted.find(
    (s) => s.id === panel.subDraft.stageId
  )?.name;

  if (panel.loading) return <TableSkeleton rows={5} />;

  return (
    <section className={className ? `surface-panel ${className}` : "surface-panel"}>
      <div className="panel-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            {t("crm.stages.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("crm.stages.description")}
          </p>
        </div>
        <Button type="button" size="sm" onClick={panel.openCreate}>
          <Plus className="me-1.5 h-3.5 w-3.5" />
          {t("crm.stages.add")}
        </Button>
      </div>

      {panel.sorted.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={t("crm.empty.stages")}
            description={t("crm.empty.stagesDesc")}
            actionLabel={t("crm.stages.add")}
            onAction={panel.openCreate}
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {panel.sorted.map((stage, index) => (
            <CrmStageListItem
              key={stage.id}
              stage={stage}
              index={index}
              count={panel.sorted.length}
              busy={panel.busy}
              expanded={panel.expandedStageId === stage.id}
              onToggleExpand={(id) =>
                panel.setExpandedStageId((prev) => (prev === id ? null : id))
              }
              onMove={(i, dir) => void panel.move(i, dir)}
              onEdit={panel.openEdit}
              onDuplicate={panel.openDuplicate}
              onToggleActive={(s) => void panel.toggleActive(s)}
              onDelete={panel.askDelete}
              onAddSub={panel.openCreateSub}
              onEditSub={panel.openEditSub}
              onToggleSubActive={(s) => void panel.toggleSubActive(s)}
              onMoveSub={(stageId, i, dir) => void panel.moveSub(stageId, i, dir)}
              onDeleteSub={(s) => void panel.deleteSub(s)}
            />
          ))}
        </ul>
      )}

      <CrmStageFormSheet
        open={panel.formOpen}
        draft={panel.draft}
        busy={panel.busy}
        onOpenChange={panel.setFormOpen}
        onDraftChange={panel.setDraft}
        onSave={() => void panel.onSave()}
      />

      <CrmSubStageFormSheet
        open={panel.subFormOpen}
        draft={panel.subDraft}
        busy={panel.busy}
        stageName={activeStageName}
        onOpenChange={panel.setSubFormOpen}
        onDraftChange={panel.setSubDraft}
        onSave={() => void panel.onSaveSub()}
      />

      <CrmStageDeleteDialog
        deleteId={panel.deleteId}
        stages={panel.sorted}
        needsMove={panel.needsMove}
        leadCount={panel.leadCount}
        moveToStageId={panel.moveToStageId}
        busy={panel.busy}
        onOpenChange={(o) => {
          if (!o) panel.cancelDelete();
        }}
        onMoveToStageChange={panel.setMoveToStageId}
        onCancel={panel.cancelDelete}
        onConfirm={() => void panel.confirmDelete()}
      />
    </section>
  );
}
