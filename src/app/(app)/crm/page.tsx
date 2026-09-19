"use client";

import dynamic from "next/dynamic";
import { ArrowLeft, ChevronDown, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CrmHubSidebar } from "@/components/crm/crm-hub-sidebar";
import { CrmLiveStatus } from "@/components/crm/crm-live-status";
import { useCrmHub } from "@/hooks/use-crm-hub";
import { useTranslation } from "@/hooks/use-translation";

const panelLoading = () => <Skeleton className="h-72 w-full rounded-xl" />;

const CrmPhoneDuplicatesBanner = dynamic(
  () =>
    import("@/components/crm/crm-phone-duplicates-banner").then(
      (m) => m.CrmPhoneDuplicatesBanner
    ),
  { loading: panelLoading }
);
const CrmDashboardPanel = dynamic(
  () =>
    import("@/components/crm/crm-dashboard-panel").then(
      (m) => m.CrmDashboardPanel
    ),
  { loading: panelLoading }
);
const CrmLeadsOverview = dynamic(
  () =>
    import("@/components/crm/crm-leads-overview").then((m) => m.CrmLeadsOverview),
  { loading: panelLoading }
);
const CrmLeadsPanel = dynamic(
  () => import("@/components/crm/crm-leads-panel").then((m) => m.CrmLeadsPanel),
  { loading: panelLoading }
);
const CrmDelayPanel = dynamic(
  () => import("@/components/crm/crm-delay-panel").then((m) => m.CrmDelayPanel),
  { loading: panelLoading }
);
const CrmDayAgendaPanel = dynamic(
  () =>
    import("@/components/crm/crm-day-agenda-panel").then(
      (m) => m.CrmDayAgendaPanel
    ),
  { loading: panelLoading }
);
const CrmPipelinePanel = dynamic(
  () =>
    import("@/components/crm/crm-pipeline-panel").then((m) => m.CrmPipelinePanel),
  { loading: panelLoading }
);
const CrmActivitiesPanel = dynamic(
  () =>
    import("@/components/crm/crm-activities-panel").then(
      (m) => m.CrmActivitiesPanel
    ),
  { loading: panelLoading }
);
const CrmFeedbackPanel = dynamic(
  () =>
    import("@/components/crm/crm-feedback-panel").then((m) => m.CrmFeedbackPanel),
  { loading: panelLoading }
);
const CrmPerformancePanel = dynamic(
  () =>
    import("@/components/crm/crm-performance-panel").then(
      (m) => m.CrmPerformancePanel
    ),
  { loading: panelLoading }
);
const CrmStagesPanel = dynamic(
  () =>
    import("@/components/crm/crm-stages-panel").then((m) => m.CrmStagesPanel),
  { loading: panelLoading }
);
const CrmWebsiteAutoLeadPanel = dynamic(
  () =>
    import("@/components/crm/crm-website-auto-lead-panel").then(
      (m) => m.CrmWebsiteAutoLeadPanel
    ),
  { loading: panelLoading }
);
const CrmBusinessTypesPanel = dynamic(
  () =>
    import("@/components/crm/crm-business-types-panel").then(
      (m) => m.CrmBusinessTypesPanel
    ),
  { loading: panelLoading }
);
const CrmReportsPanel = dynamic(
  () =>
    import("@/components/crm/crm-reports-panel").then((m) => m.CrmReportsPanel),
  { loading: panelLoading }
);
const CrmLeadsBulkAdd = dynamic(
  () =>
    import("@/components/crm/crm-leads-bulk-add").then((m) => m.CrmLeadsBulkAdd),
  { ssr: false }
);
const CrmPhoneContactImport = dynamic(
  () =>
    import("@/components/crm/crm-phone-contact-import").then(
      (m) => m.CrmPhoneContactImport
    ),
  { ssr: false }
);
const CrmLeadSheet = dynamic(
  () => import("@/components/crm/crm-lead-sheet").then((m) => m.CrmLeadSheet),
  { ssr: false }
);
const CrmLeadFormSheet = dynamic(
  () =>
    import("@/components/crm/crm-lead-form-sheet").then(
      (m) => m.CrmLeadFormSheet
    ),
  { ssr: false }
);
const CrmSalesProfileSheet = dynamic(
  () =>
    import("@/components/crm/crm-sales-profile-sheet").then(
      (m) => m.CrmSalesProfileSheet
    ),
  { ssr: false }
);

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
        className="[&_.type-subtitle]:hidden sm:[&_.type-subtitle]:block"
        mobileActionsClassName="flex-col [&_button]:w-full [&_button]:flex-none [&_button]:min-w-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CrmLiveStatus
              lastUpdatedAt={hub.lastUpdatedAt}
              syncing={hub.syncing}
            />
            {hub.canCreate ? (
              <>
                <CrmPhoneContactImport
                  onOpenLead={(id) => hub.openViewLead(id)}
                  onCreate={(draft) => {
                    hub.openCreate();
                    window.sessionStorage.setItem(
                      "rootk.crm.contact-draft",
                      JSON.stringify(draft)
                    );
                  }}
                />
                <CrmLeadsBulkAdd
                  stages={hub.safeStages}
                  businessTypes={hub.safeBusinessTypes}
                  employees={hub.safeEmployees}
                  canAssign={hub.canAssign}
                  onImported={() => void hub.reloadVisible()}
                  className="min-h-11"
                />
                <Button onClick={hub.openCreate}>
                  <Plus className="h-4 w-4" />
                  {t("crm.actions.addLead")}
                </Button>
              </>
            ) : null}
          </div>
        }
        mobileActions={
          <>
            <CrmLiveStatus
              lastUpdatedAt={hub.lastUpdatedAt}
              syncing={hub.syncing}
              className="w-full justify-center"
            />
            {hub.canCreate ? (
              <>
                <Button
                  type="button"
                  className="min-h-11 w-full rounded-xl"
                  onClick={hub.openCreate}
                >
                  <Plus className="h-4 w-4" />
                  {t("crm.actions.addLead")}
                </Button>
                <details className="group w-full rounded-xl border border-border/70 bg-card/60 open:bg-card">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-[13px] font-semibold text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                    <span>{t("crm.actions.moreTools")}</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="flex flex-wrap gap-2 border-t border-border/50 p-2.5">
                    <CrmLeadsBulkAdd
                      stages={hub.safeStages}
                      businessTypes={hub.safeBusinessTypes}
                      employees={hub.safeEmployees}
                      canAssign={hub.canAssign}
                      onImported={() => void hub.reloadVisible()}
                      className="min-h-11 min-w-[calc(50%-0.25rem)] flex-1"
                    />
                    <CrmPhoneContactImport
                      onOpenLead={(id) => hub.openViewLead(id)}
                      onCreate={(draft) => {
                        hub.openCreate();
                        window.sessionStorage.setItem(
                          "rootk.crm.contact-draft",
                          JSON.stringify(draft)
                        );
                      }}
                    />
                  </div>
                </details>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:gap-4">
        <CrmHubSidebar
          tab={hub.tab}
          onTabChange={hub.onTabChange}
          canViewPerformance={hub.canViewPerformance}
          canManageStages={hub.canManageStages}
          canManageBusinessTypes={hub.canManageBusinessTypes}
          canViewReports={hub.canViewReports}
          delayCount={hub.delayCount}
        />

        <div
          className={`min-w-0 space-y-3 transition-opacity duration-300 sm:space-y-4 md:space-y-5 ${
            hub.syncing && !hub.loading ? "opacity-[0.92]" : "opacity-100"
          }`}
        >
          {hub.tab === "leads" ? (
            <CrmPhoneDuplicatesBanner onOpenLead={(id) => hub.openViewLead(id)} />
          ) : null}
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
              canAssign={hub.canAssign}
              canViewOthers={hub.canViewOthers || hub.canViewTeam}
            />
          ) : null}

          {hub.tab === "leads" && hub.leadsView === "cards" ? (
            <CrmLeadsOverview
              stages={hub.safeStages}
              stageCounts={hub.stageCounts}
              totalLeads={hub.overviewTotal}
              loading={hub.loading && hub.safePipelineLeads.length === 0}
              employees={hub.safeEmployees}
              canAssign={hub.canAssign}
              canViewOthers={hub.canViewOthers || hub.canViewTeam}
              ownerEmployeeId={hub.overviewOwnerEmployeeId}
              onOwnerChange={hub.setOverviewOwner}
              onOpenAllLeads={hub.openAllLeads}
              onOpenStage={hub.openStageLeads}
              onAddLead={hub.canCreate ? hub.openCreate : undefined}
              onImported={hub.canCreate ? () => void hub.reloadVisible() : undefined}
              canCreate={hub.canCreate}
              businessTypes={hub.safeBusinessTypes}
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
                onRowClick={(lead) => hub.openViewLead(lead.id)}
                onViewHistory={(lead) => hub.openViewLead(lead.id, "timeline")}
                onAddLead={hub.canCreate ? hub.openCreate : undefined}
                onImported={() => void hub.reloadVisible()}
                canAssign={hub.canAssign}
                canViewOthers={hub.canViewOthers}
                canViewTeam={hub.canViewTeam}
                canImport={hub.canCreate}
                businessTypes={hub.safeBusinessTypes}
                feedbackTypes={hub.safeFeedbackTypes}
              />
            </div>
          ) : null}

          {hub.tab === "delay" ? (
            <CrmDelayPanel
              leads={hub.safeLeadsPage}
              stages={hub.safeStages}
              employees={hub.safeEmployees}
              filters={hub.leadFilters}
              onFiltersChange={hub.setDelayLeadFilters}
              loading={hub.loading}
              syncing={hub.syncing}
              onRowClick={(lead) => hub.openViewLead(lead.id)}
              onViewHistory={(lead) => hub.openViewLead(lead.id, "timeline")}
              canAssign={hub.canAssign}
              canViewOthers={hub.canViewOthers}
              canViewTeam={hub.canViewTeam}
              feedbackTypes={hub.safeFeedbackTypes}
            />
          ) : null}

          {hub.tab === "agenda" ? (
            <CrmDayAgendaPanel
              employees={hub.safeEmployees}
              onOpenLead={(id) => hub.openViewLead(id)}
            />
          ) : null}

          {hub.tab === "pipeline" ? (
            <CrmPipelinePanel
              stages={hub.safeStages}
              leads={hub.safePipelineLeads}
              employees={hub.safeEmployees}
              loading={hub.loading}
              onLeadClick={(lead) => hub.openViewLead(lead.id)}
            />
          ) : null}

          {hub.tab === "activities" ? (
            <CrmActivitiesPanel
              activities={hub.safeActivities}
              leads={hub.safeActivityLeads}
              employees={hub.safeEmployees}
              loading={hub.loading}
              onLeadClick={(id) => hub.openViewLead(id)}
            />
          ) : null}

          {hub.tab === "feedback" ? (
            <CrmFeedbackPanel
              feedback={hub.safeFeedback}
              feedbackTypes={hub.safeFeedbackTypes}
              leads={hub.feedbackLeadPool}
              reasons={hub.safeDashboard?.feedbackReasons}
              loading={hub.loading}
              onLeadClick={(id) => hub.openViewLead(id)}
            />
          ) : null}

          {hub.tab === "performance" && hub.canViewPerformance ? (
            <CrmPerformancePanel
              rows={
                hub.safeDashboard?.salesPerformance?.length
                  ? hub.safeDashboard.salesPerformance
                  : hub.safePerformance
              }
              breakdown={hub.safeDashboard?.interactionBreakdown}
              filters={hub.dashFilters}
              onFiltersChange={hub.setDashFilters}
              employees={hub.safeEmployees}
              canAssign={hub.canAssign}
              canViewOthers={hub.canViewOthers || hub.canViewTeam}
              loading={hub.loading}
              onSelectEmployee={(id) => hub.setProfileEmployeeId(id)}
            />
          ) : null}

          {hub.tab === "stages" && hub.canManageStages ? (
            <div className="grid gap-4">
              <CrmStagesPanel />
              {hub.canAssign ? (
                <CrmWebsiteAutoLeadPanel employees={hub.safeEmployees} />
              ) : null}
            </div>
          ) : null}

          {hub.tab === "businessTypes" && hub.canManageBusinessTypes ? (
            <CrmBusinessTypesPanel />
          ) : null}

          {hub.tab === "reports" && hub.canViewReports ? (
            <CrmReportsPanel
              dashboard={hub.safeDashboard}
              loading={hub.loading}
              filters={hub.dashFilters}
              onFiltersChange={hub.setDashFilters}
              employees={hub.safeEmployees}
              canAssign={hub.canAssign}
              canViewOthers={hub.canViewOthers || hub.canViewTeam}
            />
          ) : null}
        </div>
      </div>

      {hub.viewLeadId ? (
        <CrmLeadSheet
          leadId={hub.viewLeadId}
          open
          initialTab={hub.viewLeadTab}
          onOpenChange={(open) => {
            if (!open) hub.closeViewLead();
          }}
          stages={hub.safeStages}
          employees={hub.safeEmployees}
          feedbackTypes={hub.safeFeedbackTypes}
          businessTypes={hub.safeBusinessTypes}
          onEdit={(lead) => {
            hub.closeViewLead();
            hub.openEdit(lead);
          }}
          onChanged={() => void hub.reloadVisible()}
        />
      ) : null}

      {hub.formOpen ? (
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
          onOpenExistingLead={(id) => {
            hub.setFormOpen(false);
            hub.openViewLead(id);
          }}
        />
      ) : null}

      {hub.profileEmployeeId ? (
        <CrmSalesProfileSheet
          employeeId={hub.profileEmployeeId}
          open
          onOpenChange={(open) => {
            if (!open) hub.setProfileEmployeeId(null);
          }}
        />
      ) : null}
    </PageTransition>
  );
}
