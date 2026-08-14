"use client";

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
} from "@/types/crm";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] sm:gap-2">
      <dt className="text-[11px] text-muted-foreground sm:text-[13px]">{label}</dt>
      <dd className="min-w-0 break-words text-[13px] font-medium text-foreground">
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
}: CrmLeadSheetTabsProps) {
  const { t } = useTranslation();
  const businessTypeName =
    businessTypes.find((b) => b.id === lead.businessTypeId)?.name || "—";
  const employeeNameById = new Map(employees.map((e) => [e.id, e.name]));

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="mt-4 flex min-h-0 flex-1 flex-col">
      <TabsList className="shrink-0">
        <TabsTrigger value="overview">{t("crm.leadSheet.overview")}</TabsTrigger>
        <TabsTrigger value="timeline">{t("crm.leadSheet.timeline")}</TabsTrigger>
        <TabsTrigger value="feedback">{t("crm.leadSheet.feedback")}</TabsTrigger>
      </TabsList>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <TabsContent value="overview" className="mt-3 space-y-3">
          <section className="rounded-xl border border-border/60 p-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t("crm.leadSheet.information")}
            </h3>
            <dl className="mt-2 grid gap-2 text-[13px]">
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
              <Row label={t("crm.leadSheet.notes")} value={lead.notes || "—"} />
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="timeline" className="mt-3">
          {timeline.length === 0 ? (
            <EmptyState compact title={t("crm.leadSheet.noTimeline")} />
          ) : (
            <ul className="space-y-2">
              {timeline.map((item) => (
                <li key={item.id} className="rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold">{item.title}</p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {formatMaybeDateTime(item.occurredAt)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {item.type}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="mt-3">
          {feedback.length === 0 ? (
            <EmptyState compact title={t("crm.leadSheet.noFeedback")} />
          ) : (
            <ul className="space-y-2">
              {feedback.map((item) => (
                <li key={item.id} className="rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold">
                      {item.callAnswered === false
                        ? t("crm.feedback.noAnswer")
                        : t("crm.feedback.answered")}
                    </p>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.callAnswered === false
                        ? t("crm.feedback.inactiveCall")
                        : t("crm.feedback.activeCall")}
                    </span>
                  </div>
                  {item.customerFeedback ? (
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {item.customerFeedback}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
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
