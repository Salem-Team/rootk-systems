"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CrmSalesProfileLeadsDialog } from "@/components/crm/crm-sales-profile-leads-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/use-translation";
import {
  filterSalesProfileLeads,
  mergeOwnedProfileLeads,
  ownedSalesProfileLeads,
} from "@/lib/crm/sales-profile";
import { formatIsoDateTime } from "@/lib/format-time";
import {
  ensureCrmList,
  ensurePaginatedLeads,
  ensureSalesProfile,
} from "@/lib/crm-normalize";
import {
  getCrmLeads,
  getCrmSalesProfile,
  getCrmStages,
} from "@/services/crm.service";
import type {
  CrmSalesProfile,
  CrmSalesProfileCardKey,
  CrmSalesProfileLead,
  CrmStage,
} from "@/types/crm";

interface CrmSalesProfileSheetProps {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatWhen(iso: string): string {
  return formatIsoDateTime(iso, "en", "d MMM · h:mm a");
}

/** Sales user profile: KPIs, pipeline, recent activity, feedback. */
export function CrmSalesProfileSheet({
  employeeId,
  open,
  onOpenChange,
}: CrmSalesProfileSheetProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<CrmSalesProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<{
    key: CrmSalesProfileCardKey;
    title: string;
    stageId?: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !employeeId) {
      setProfile(null);
      setDetail(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    void Promise.all([
      getCrmSalesProfile(employeeId),
      getCrmLeads({
        ownerEmployeeId: employeeId,
        page: 1,
        pageSize: 100,
        sort: "updatedAt",
        order: "desc",
      }),
      getCrmStages(),
    ]).then(([profileRes, leadsRes, stagesRes]) => {
      if (!mounted) return;
      const next = profileRes.success
        ? ensureSalesProfile(profileRes.data)
        : null;
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const fallback = leadsRes.success
        ? ensurePaginatedLeads(leadsRes.data).items
        : [];
      const stages = stagesRes.success
        ? ensureCrmList<CrmStage>(stagesRes.data)
        : [];
      setProfile(mergeOwnedProfileLeads(next, fallback, stages));
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [open, employeeId]);

  const detailLeads: CrmSalesProfileLead[] = profile && detail
    ? filterSalesProfileLeads(
        ownedSalesProfileLeads(profile.leads ?? [], profile.employeeId),
        detail.key,
        detail.stageId
      )
    : [];

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {profile?.employeeName ?? t("crm.salesProfile.title")}
          </SheetTitle>
          <SheetDescription>{t("crm.performance.description")}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !profile ? (
          <div className="mt-8">
            <EmptyState title={t("crm.empty.performance")} />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    key: "total" as const,
                    label: t("crm.salesProfile.total"),
                    value: profile.overview.totalLeads,
                  },
                  {
                    key: "active" as const,
                    label: t("crm.salesProfile.active"),
                    value: profile.overview.activeLeads,
                  },
                  {
                    key: "won" as const,
                    label: t("crm.salesProfile.won"),
                    value: profile.overview.won,
                  },
                  {
                    key: "lost" as const,
                    label: t("crm.salesProfile.lost"),
                    value: profile.overview.lost,
                  },
                  {
                    key: "conversion" as const,
                    label: t("crm.salesProfile.conversion"),
                    value: `${Number(profile.overview?.conversionRate ?? 0).toFixed(1)}%`,
                  },
                  {
                    key: "pendingFollowUps" as const,
                    label: t("crm.salesProfile.pendingFollowUps"),
                    value: profile.overview.pendingFollowUps,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setDetail({ key: item.key, title: item.label })
                  }
                  className="rounded-lg border border-border/70 px-3 py-2.5 text-start transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <p className="text-[11px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                    {item.value}
                  </p>
                </button>
              ))}
            </div>

            <section>
              <h3 className="text-sm font-semibold">
                {t("crm.salesProfile.pipeline")}
              </h3>
              <ul className="mt-2 grid gap-1.5">
                {(profile.pipeline ?? []).length === 0 ? (
                  <li className="text-[12px] text-muted-foreground">
                    {t("crm.empty.chart")}
                  </li>
                ) : (
                  (profile.pipeline ?? []).map((stage) => (
                    <li key={stage.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setDetail({
                            key: "stage",
                            title: stage.name,
                            stageId: stage.id,
                          })
                        }
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-start text-[13px] transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: stage.color }}
                            aria-hidden
                          />
                          <span className="truncate font-medium">
                            {stage.name}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {stage.count}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold">
                {t("crm.salesProfile.recent")}
              </h3>
              <ul className="mt-2 grid gap-1.5">
                {(profile.recentActivities ?? []).length === 0 ? (
                  <li className="text-[12px] text-muted-foreground">
                    {t("crm.empty.activities")}
                  </li>
                ) : (
                  (profile.recentActivities ?? []).slice(0, 8).map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-border/60 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium">{a.title}</p>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {formatWhen(a.occurredAt)}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold">
                {t("crm.salesProfile.feedback")}
              </h3>
              <ul className="mt-2 grid gap-1.5">
                {(profile.feedback ?? []).length === 0 ? (
                  <li className="text-[12px] text-muted-foreground">
                    {t("crm.empty.feedback")}
                  </li>
                ) : (
                  (profile.feedback ?? []).slice(0, 6).map((f) => (
                    <li
                      key={f.id}
                      className="rounded-lg border border-border/60 px-3 py-2 text-[13px] text-muted-foreground"
                    >
                      {f.customerFeedback || f.notes || "—"}
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
    <CrmSalesProfileLeadsDialog
      open={Boolean(detail)}
      onOpenChange={(next) => {
        if (!next) setDetail(null);
      }}
      title={detail?.title ?? ""}
      employeeName={profile?.employeeName ?? ""}
      leads={detailLeads}
    />
    </>
  );
}
