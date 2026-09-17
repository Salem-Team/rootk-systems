"use client";

import { CrmMentionChips, CrmMentionText } from "@/components/crm/crm-mention-text";
import { CrmLeadRequestBudgetEditor } from "@/components/crm/crm-lead-request-budget-editor";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/use-translation";
import { formatMaybeDateTime } from "@/lib/crm/format";
import type { Employee } from "@/types";
import type {
  CrmBusinessType,
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmStageCategory,
} from "@/types/crm";

function Row({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div
      className={
        multiline
          ? "grid gap-1.5 rounded-xl bg-muted/30 px-3 py-2.5 sm:rounded-lg sm:bg-transparent sm:px-0 sm:py-0 sm:gap-1"
          : "grid gap-1 rounded-xl bg-muted/30 px-3 py-2.5 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] sm:gap-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0"
      }
    >
      <dt className="text-[11px] font-medium text-muted-foreground sm:text-[13px] sm:font-normal">
        {label}
      </dt>
      <dd
        className={
          multiline
            ? "min-w-0 whitespace-pre-wrap break-words text-[0.92rem] font-medium leading-relaxed text-foreground sm:rounded-lg sm:bg-muted/40 sm:px-3 sm:py-2 sm:text-[13px]"
            : "min-w-0 break-words text-[0.92rem] font-medium text-foreground sm:text-[13px]"
        }
      >
        {value}
      </dd>
    </div>
  );
}

interface CrmLeadSheetTabsProps {
  tab: string;
  onTabChange: (tab: string) => void;
  lead: CrmLead;
  timeline: CrmLeadActivity[];
  feedback: CrmLeadFeedback[];
  businessTypes?: CrmBusinessType[];
  employees?: Employee[];
  lossReasonName?: string | null;
  stageCategory?: CrmStageCategory;
  onRequestBudgetSaved?: () => void;
}

/** Overview / timeline / feedback tabs for the lead detail sheet. */
export function CrmLeadSheetTabs({
  tab,
  onTabChange,
  lead,
  timeline,
  feedback,
  businessTypes = [],
  employees = [],
  lossReasonName = null,
  stageCategory,
  onRequestBudgetSaved,
}: CrmLeadSheetTabsProps) {
  const { t } = useTranslation();
  const businessTypeName =
    businessTypes.find((b) => b.id === lead.businessTypeId)?.name || "—";
  const employeeNameById = new Map(employees.map((e) => [e.id, e.name]));

  return (
    <Tabs
      value={tab}
      onValueChange={onTabChange}
      className="mt-0 flex min-h-0 flex-1 flex-col"
    >
      <div className="sticky top-0 z-10 -mx-3 bg-card/95 px-3 pb-2 pt-2 backdrop-blur-xl supports-[backdrop-filter]:bg-card/90 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-3 sm:backdrop-blur-none">
        <TabsList className="mobile-seg-list grid h-auto w-full grid-cols-3 gap-1 p-1 sm:inline-flex sm:h-9 sm:w-auto sm:grid-cols-none">
          <TabsTrigger
            value="overview"
            className="min-h-11 touch-manipulation rounded-xl text-[12px] font-semibold sm:min-h-0 sm:rounded-md sm:text-sm sm:font-medium"
          >
            {t("crm.leadSheet.overview")}
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="min-h-11 touch-manipulation rounded-xl text-[12px] font-semibold sm:min-h-0 sm:rounded-md sm:text-sm sm:font-medium"
          >
            {t("crm.leadSheet.timeline")}
          </TabsTrigger>
          <TabsTrigger
            value="feedback"
            className="min-h-11 touch-manipulation rounded-xl text-[12px] font-semibold sm:min-h-0 sm:rounded-md sm:text-sm sm:font-medium"
          >
            {t("crm.leadSheet.feedback")}
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
        <TabsContent value="overview" className="mt-3 space-y-3 outline-none">
          <CrmLeadRequestBudgetEditor
            lead={lead}
            onSaved={onRequestBudgetSaved}
          />
          <section className="rounded-2xl border border-border/60 p-3 sm:rounded-xl sm:p-3.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t("crm.leadSheet.information")}
            </h3>
            <dl className="mt-2.5 grid gap-2 text-[13px] sm:gap-2.5">
              <Row label={t("crm.leadSheet.company")} value={lead.companyName || "—"} />
              <Row
                label={t("crm.leadSheet.businessType")}
                value={businessTypeName}
              />
              <Row label={t("crm.leadSheet.email")} value={lead.email || "—"} />
              <Row
                label={t("crm.leadSheet.source")}
                value={t(`crm.source.${lead.source}`)}
              />
              <Row
                label={t("crm.leads.colStatus")}
                value={t(`crm.status.${lead.status}`)}
              />
              {stageCategory === "lost" ? (
                <Row
                  label={t("crm.lossReason.label")}
                  value={lossReasonName || "—"}
                />
              ) : null}
              <Row
                label={t("crm.leadSheet.nextAction")}
                value={t(`crm.nextAction.${lead.nextAction}`)}
              />
              <Row
                label={t("crm.leadSheet.nextFollowUp")}
                value={formatMaybeDateTime(lead.nextFollowUpAt)}
              />
              <Row
                label={t("crm.leadSheet.tags")}
                value={
                  (lead.tags ?? []).length
                    ? (lead.tags ?? []).map((tag) => t(`crm.tags.${tag}`)).join(", ")
                    : "—"
                }
              />
              <Row
                label={t("crm.leadSheet.notes")}
                value={lead.notes || "—"}
                multiline
              />
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="timeline" className="mt-3 outline-none">
          {timeline.length === 0 ? (
            <EmptyState compact title={t("crm.leadSheet.noTimeline")} />
          ) : (
            <ul className="space-y-2.5">
              {timeline.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-border/60 px-3.5 py-3 sm:rounded-lg sm:px-3 sm:py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[0.92rem] font-semibold leading-snug sm:text-[13px]">
                      {item.title}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {formatMaybeDateTime(item.occurredAt)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground sm:mt-1 sm:text-[12px]">
                      <CrmMentionText text={item.description} />
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                    {t(`crm.activityType.${item.type}`)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="mt-3 outline-none">
          {feedback.length === 0 ? (
            <EmptyState compact title={t("crm.leadSheet.noFeedback")} />
          ) : (
            <ul className="space-y-2.5">
              {feedback.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-border/60 px-3.5 py-3 sm:rounded-lg sm:px-3 sm:py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.92rem] font-semibold sm:text-[13px]">
                      {item.callAnswered === false
                        ? t("crm.feedback.noAnswer")
                        : t("crm.feedback.answered")}
                    </p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.callAnswered === false
                        ? t("crm.feedback.inactiveCall")
                        : t("crm.feedback.activeCall")}
                    </span>
                  </div>
                  {item.customerFeedback ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground sm:mt-1 sm:text-[12px]">
                      <CrmMentionText
                        text={item.customerFeedback}
                        names={(item.mentionedUsers ?? []).map((u) => u.name)}
                      />
                    </p>
                  ) : null}
                  <CrmMentionChips users={item.mentionedUsers} />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("crm.feedback.recordedBy")}:{" "}
                    <span className="font-medium text-foreground">
                      {item.recordedByEmployeeId
                        ? (employeeNameById.get(item.recordedByEmployeeId) ?? "—")
                        : "—"}
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {formatMaybeDateTime(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
