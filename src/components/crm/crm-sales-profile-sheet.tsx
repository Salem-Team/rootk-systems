"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/use-translation";
import { ensureSalesProfile } from "@/lib/crm-normalize";
import { getCrmSalesProfile } from "@/services/crm.service";
import type { CrmSalesProfile } from "@/types/crm";

interface CrmSalesProfileSheetProps {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatWhen(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM · HH:mm");
  } catch {
    return iso;
  }
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

  useEffect(() => {
    if (!open || !employeeId) {
      setProfile(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    void getCrmSalesProfile(employeeId).then((res) => {
      if (!mounted) return;
      if (res.success) setProfile(ensureSalesProfile(res.data));
      else setProfile(null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [open, employeeId]);

  return (
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
              {[
                {
                  label: t("crm.salesProfile.total"),
                  value: profile.overview.totalLeads,
                },
                {
                  label: t("crm.salesProfile.active"),
                  value: profile.overview.activeLeads,
                },
                {
                  label: t("crm.salesProfile.won"),
                  value: profile.overview.won,
                },
                {
                  label: t("crm.salesProfile.lost"),
                  value: profile.overview.lost,
                },
                {
                  label: t("crm.salesProfile.conversion"),
                  value: `${Number(profile.overview?.conversionRate ?? 0).toFixed(1)}%`,
                },
                {
                  label: t("crm.salesProfile.pendingFollowUps"),
                  value: profile.overview.pendingFollowUps,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border/70 px-3 py-2.5"
                >
                  <p className="text-[11px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                    {item.value}
                  </p>
                </div>
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
                    <li
                      key={stage.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-[13px]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: stage.color }}
                          aria-hidden
                        />
                        <span className="truncate font-medium">{stage.name}</span>
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {stage.count}
                      </span>
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
  );
}
