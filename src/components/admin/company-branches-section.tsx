import Link from "next/link";
import { Building2, Clock, Globe2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { CompanySettings } from "@/types";
import type { OfficeLocation } from "@/types/org";

export function CompanyBranchesSection({
  timezone,
  hoursLabel,
  loadingMeta,
  branches,
  onNavigate,
}: {
  timezone: CompanySettings["timezone"];
  hoursLabel: string;
  loadingMeta: boolean;
  branches: OfficeLocation[];
  onNavigate?: (section: "policies" | "locations") => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.workingHours")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.workingHoursDesc")}
          </p>
        </div>
        <div className="panel-body flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 font-mono tabular-nums">
              {loadingMeta ? "…" : hoursLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" aria-hidden />
              {timezone}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.("policies")}
            >
              {t("admin.navPolicies")}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/schedule">{t("settings.openSchedule")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="panel-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
              <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t("admin.branches")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("admin.branchesLiveDesc")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.("locations")}
          >
            {t("admin.manageLocations")}
          </Button>
        </div>
        {loadingMeta ? (
          <div className="panel-body flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ul className="panel-body grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {branches.length === 0 ? (
              <li className="col-span-full rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                {t("admin.branchesEmpty")}
              </li>
            ) : (
              branches.map((branch) => (
                <li
                  key={branch.id}
                  className="rounded-xl border border-border/70 bg-muted/20 p-3.5 transition-colors hover:border-primary/20 hover:bg-muted/35"
                >
                  <p className="text-[13px] font-semibold">{branch.name}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    {branch.address || branch.city}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {branch.city} · {branch.timezone}
                    {branch.latitude != null && branch.longitude != null
                      ? ` · ${branch.radiusMeters ?? 200}m`
                      : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </>
  );
}
