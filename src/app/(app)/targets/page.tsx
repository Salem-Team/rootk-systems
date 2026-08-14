"use client";

import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { TargetAssignSheet } from "@/components/targets/target-assign-sheet";
import { TargetHubSidebar } from "@/components/targets/target-hub-sidebar";
import { TargetsTabContent } from "@/components/targets/targets-tab-content";
import { TargetViewSheet } from "@/components/targets/target-view-sheet";
import { useTargetsPage } from "@/components/targets/use-targets-page";
import { useTranslation } from "@/hooks/use-translation";

export default function TargetsPage() {
  const { t } = useTranslation();
  const page = useTargetsPage();

  if (!page.ready) return <PageSkeleton />;

  return (
    <PageTransition>
      <PageHeader
        eyebrow={t("targets.page.eyebrow")}
        title={t("targets.page.title")}
        description={
          page.selectedCategory
            ? `${t("targets.page.description")} · ${page.selectedCategory.name}`
            : t("targets.page.description")
        }
        actions={
          page.canAssign ? (
            <Button onClick={page.openCreate}>
              <Plus className="h-4 w-4" />
              {t("targets.assign.title")}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <TargetHubSidebar
            tab={page.tab}
            onTabChange={page.setTab}
            categories={page.categories}
            selectedCategoryId={page.filters.categoryId ?? ""}
            onCategoryChange={page.onCategoryChange}
            stats={page.stats}
            canManageCatalog={page.canManageCatalog}
            canViewReports={page.canViewReports}
          />
        </aside>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          <TargetsTabContent
            tab={page.tab}
            stats={page.stats}
            employeeMap={page.employeeMap}
            categoryMap={page.categoryMap}
            employees={page.employees}
            targets={page.targets}
            targetsLoading={page.targetsLoading}
            filters={page.filters}
            setFilters={page.setFilters}
            assigneeCounts={page.assigneeCounts}
            canManageCompanyTargets={page.canManageCompanyTargets}
            canAssign={page.canAssign}
            canViewReports={page.canViewReports}
            canManageCatalog={page.canManageCatalog}
            workEmployeeId={page.workEmployeeId}
            onCategoryFromChart={page.onCategoryFromChart}
            onView={page.openView}
            onEdit={page.openEdit}
            onDelete={page.onDeleteTarget}
            onCreate={page.openCreate}
          />
        </div>
      </div>

      <TargetViewSheet
        target={page.viewingTarget}
        open={Boolean(page.viewingTarget)}
        onOpenChange={(open) => {
          if (!open) page.setViewingTarget(null);
        }}
        categories={page.categoryMap}
        employees={page.employeeMap}
        onEdit={page.canEdit ? page.openEdit : undefined}
      />

      <TargetAssignSheet
        open={page.assignOpen}
        onOpenChange={page.setAssignOpen}
        categories={page.categories}
        types={page.types}
        employees={page.employees}
        editingTarget={page.editingTarget}
        defaultCategoryId={page.filters.categoryId}
        onSaved={() => {
          void page.loadTargets();
          void page.loadDashboard();
        }}
      />
    </PageTransition>
  );
}
