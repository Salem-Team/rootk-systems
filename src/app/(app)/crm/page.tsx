"use client";

import { ArrowLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { CrmActivitiesPanel } from "@/components/crm/crm-activities-panel";
import { CrmBusinessTypesPanel } from "@/components/crm/crm-business-types-panel";
import { CrmDashboardPanel } from "@/components/crm/crm-dashboard-panel";
import { CrmFeedbackPanel } from "@/components/crm/crm-feedback-panel";
import { CrmHubSidebar } from "@/components/crm/crm-hub-sidebar";
import { CrmLeadFormSheet } from "@/components/crm/crm-lead-form-sheet";
import { CrmLeadSheet } from "@/components/crm/crm-lead-sheet";
import { CrmLeadsOverview } from "@/components/crm/crm-leads-overview";
import { CrmLeadsPanel } from "@/components/crm/crm-leads-panel";
import { CrmPerformancePanel } from "@/components/crm/crm-performance-panel";
import { CrmPipelinePanel } from "@/components/crm/crm-pipeline-panel";
import { CrmReportsPanel } from "@/components/crm/crm-reports-panel";
import { CrmSalesProfileSheet } from "@/components/crm/crm-sales-profile-sheet";
import { CrmStagesPanel } from "@/components/crm/crm-stages-panel";
import { useCrmHub } from "@/hooks/use-crm-hub";
import { useTranslation } from "@/hooks/use-translation";

export default function CrmPage() {
  const { t } = useTranslation();
  const hub = useCrmHub();

  if (!hub.ready) return <PageSkeleton />;

  return (
    <PageTransition>
      <PageHeader
        eyebrow={t("crm.page.eyebrow")}
        title={t("crm.page.title")}
        description={t("crm.page.description")}
        actions={
          hub.canCreate ? (
            <Button onClick={hub.openCreate}>
              <Plus className="h-4 w-4" />
              {t("crm.actions.addLead")}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CrmHubSidebar
            tab={hub.tab}
            onTabChange={hub.onTabChange}
            canViewPerformance={hub.canViewPerformance}
            canManageStages={hub.canManageStages}
            canManageBusinessTypes={hub.canManageBusinessTypes}
            canViewReports={hub.canViewReports}
          />
        </aside>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          {hub.tab === "dashboard" && hub.canViewDashboard ? (
            <CrmDashboardPanel
              dashboard={hub.safeDashboard}
              loading={hub.loading}
              filters={hub.dashFilters}
              onFiltersChange={hub.setDashFilters}
              onNavigateLeads={hub.navigateLeads}
              onNavigatePerformance={
                hub.canViewPerformance ? () => hub.setTab("performance") : undefined
              }
              employees={hub.safeEmployees}
            />
          ) : null}

          {hub.tab === "leads" && hub.leadsView === "cards" ? (
            <CrmLeadsOverview
              stages={hub.safeStages}
              stageCounts={hub.stageCounts}
              totalLeads={hub.overviewTotal}
              loading={hub.loading}
              onOpenAllLeads={hub.openAllLeads}
              onOpenStage={hub.openStageLeads}
              onAddLead={hub.canCreate ? hub.openCreate : undefined}
            />
          ) : null}

          {hub.tab === "leads" && hub.leadsView === "table" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={hub.backToLeadsCards}
                >
                  <ArrowLeft className="me-1.5 h-3.5 w-3.5 rtl:rotate-180" />
                  {t("crm.leads.backToStages")}
                </Button>
              </div>
              <CrmLeadsPanel
                leads={hub.safeLeadsPage}
                stages={hub.safeStages}
                employees={hub.safeEmployees}
                filters={hub.leadFilters}
                onFiltersChange={hub.setLeadFilters}
                loading={hub.loading}
                onRowClick={(lead) => hub.setViewLeadId(lead.id)}
                onAddLead={hub.canCreate ? hub.openCreate : undefined}
                onImported={() => void hub.reloadVisible()}
                canAssign={hub.canAssign}
                canImport={hub.canCreate}
              />
            </div>
          ) : null}

          {hub.tab === "pipeline" ? (
            <CrmPipelinePanel
              stages={hub.safeStages}
              leads={hub.safePipelineLeads}
              employees={hub.safeEmployees}
              loading={hub.loading}
              onLeadClick={(lead) => hub.setViewLeadId(lead.id)}
            />
          ) : null}

          {hub.tab === "activities" ? (
            <CrmActivitiesPanel
              activities={hub.safeActivities}
              leads={hub.safeActivityLeads}
              employees={hub.safeEmployees}
              loading={hub.loading}
              onLeadClick={(id) => hub.setViewLeadId(id)}
            />
          ) : null}

          {hub.tab === "feedback" ? (
            <CrmFeedbackPanel
              feedback={hub.safeFeedback}
              feedbackTypes={hub.safeFeedbackTypes}
              leads={hub.feedbackLeadPool}
              reasons={hub.safeDashboard?.feedbackReasons}
              loading={hub.loading}
              onLeadClick={(id) => hub.setViewLeadId(id)}
            />
          ) : null}

          {hub.tab === "performance" && hub.canViewPerformance ? (
            <CrmPerformancePanel
              rows={hub.safePerformance}
              loading={hub.loading}
              onSelectEmployee={(id) => hub.setProfileEmployeeId(id)}
            />
          ) : null}

          {hub.tab === "stages" && hub.canManageStages ? <CrmStagesPanel /> : null}

          {hub.tab === "businessTypes" && hub.canManageBusinessTypes ? (
            <CrmBusinessTypesPanel />
          ) : null}

          {hub.tab === "reports" && hub.canViewReports ? (
            <CrmReportsPanel dashboard={hub.safeDashboard} loading={hub.loading} />
          ) : null}
        </div>
      </div>

      <CrmLeadSheet
        leadId={hub.viewLeadId}
        open={Boolean(hub.viewLeadId)}
        onOpenChange={(open) => {
          if (!open) hub.setViewLeadId(null);
        }}
        stages={hub.safeStages}
        employees={hub.safeEmployees}
        feedbackTypes={hub.safeFeedbackTypes}
        businessTypes={hub.safeBusinessTypes}
        onEdit={(lead) => {
          hub.setViewLeadId(null);
          hub.openEdit(lead);
        }}
        onChanged={() => void hub.reloadVisible()}
      />

      <CrmLeadFormSheet
        open={hub.formOpen}
        onOpenChange={hub.setFormOpen}
        stages={hub.safeStages}
        businessTypes={hub.safeBusinessTypes}
        employees={hub.safeEmployees}
        editingLead={hub.editingLead}
        canAssign={hub.canAssign}
        onSaved={() => {
          void hub.reloadVisible();
        }}
      />

      <CrmSalesProfileSheet
        employeeId={hub.profileEmployeeId}
        open={Boolean(hub.profileEmployeeId)}
        onOpenChange={(open) => {
          if (!open) hub.setProfileEmployeeId(null);
        }}
      />
    </PageTransition>
  );
}
