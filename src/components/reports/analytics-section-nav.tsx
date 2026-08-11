"use client";

import {
  Activity,
  Building2,
  Clock,
  Home,
  LayoutDashboard,
  LineChart,
  Plane,
  Timer,
  UserX,
  Users,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { AnalyticsSection } from "@/components/reports/analytics-mock-data";
import type { TranslationPath } from "@/i18n";

const ITEMS: {
  id: AnalyticsSection;
  labelKey: TranslationPath;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", labelKey: "analytics.navOverview", icon: LayoutDashboard },
  { id: "attendance", labelKey: "analytics.navAttendance", icon: Activity },
  { id: "departments", labelKey: "analytics.navDepartments", icon: Building2 },
  { id: "performance", labelKey: "analytics.navPerformance", icon: Users },
  { id: "leave", labelKey: "analytics.navLeave", icon: Plane },
  { id: "hours", labelKey: "analytics.navHours", icon: Timer },
  { id: "late", labelKey: "analytics.navLate", icon: Clock },
  { id: "absence", labelKey: "analytics.navAbsence", icon: UserX },
  { id: "wfh", labelKey: "analytics.navWfh", icon: Home },
  { id: "trends", labelKey: "analytics.navTrends", icon: LineChart },
];

export function AnalyticsSectionNav({
  active,
  onChange,
}: {
  active: AnalyticsSection;
  onChange: (s: AnalyticsSection) => void;
}) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("analytics.navLabel")}
      className="scroll-x flex gap-1 pb-1 lg:flex-col lg:overflow-visible"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
              isActive
                ? "border-primary/20 bg-primary/[0.08] text-primary"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t(item.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}
