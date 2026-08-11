"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/loading-state";
import { PortalSectionNav } from "@/components/portal/portal-section-nav";
import { PortalProfilePanel } from "@/components/portal/portal-profile-panel";
import {
  PortalAchievementsPanel,
  PortalAttendancePanel,
  PortalDocumentsPanel,
  PortalEventsPanel,
  PortalLeavePanel,
  PortalManagerPanel,
  PortalNotificationsPanel,
  PortalRequestsPanel,
  PortalStatsPanel,
  PortalTeamPanel,
  PortalTimelinePanel,
} from "@/components/portal/portal-panels";
import { OverviewHome } from "@/components/portal/portal-overview-home";
import { useEmployeePortalWorkspace } from "@/components/portal/use-employee-portal-workspace";
import { useTranslation } from "@/hooks/use-translation";

export function EmployeePortalWorkspace() {
  const { t } = useTranslation();
  const workspace = useEmployeePortalWorkspace();

  if (!workspace.ready) {
    return <PageSkeleton />;
  }

  const { user, section, changeSection } = workspace;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="hidden sm:block">
        <PageHeader
          className="mb-4 sm:mb-7"
          eyebrow={t("portal.eyebrow")}
          title={t("portal.welcome", { name: user.firstName || user.displayName })}
          description={t("portal.description")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-6">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <PortalSectionNav active={section} onChange={changeSection} />
        </aside>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4 sm:space-y-6"
            >
              {section === "overview" && (
                <OverviewHome
                  streak={workspace.streak}
                  score={workspace.score}
                  balance={workspace.balance}
                  todayRecord={workspace.todayRecord}
                  dateLocale={workspace.dateLocale}
                  announcements={workspace.announcements}
                  holidays={workspace.holidays}
                  leaves={workspace.leaves}
                  employees={workspace.roster}
                  manager={workspace.manager}
                  teammates={workspace.teammates}
                />
              )}
              {section === "profile" && (
                <PortalProfilePanel employee={workspace.me} />
              )}
              {section === "attendance" && (
                <PortalAttendancePanel employee={workspace.me} />
              )}
              {section === "leave" && (
                <PortalLeavePanel leaves={workspace.leaves} employee={workspace.me} />
              )}
              {section === "requests" && <PortalRequestsPanel />}
              {section === "documents" && <PortalDocumentsPanel />}
              {section === "notifications" && <PortalNotificationsPanel />}
              {section === "team" && (
                <PortalTeamPanel
                  manager={workspace.manager}
                  managers={workspace.managers}
                  teammates={workspace.teammates}
                />
              )}
              {section === "manager" && (
                <PortalManagerPanel
                  manager={workspace.manager}
                  managers={workspace.managers}
                />
              )}
              {section === "timeline" && <PortalTimelinePanel />}
              {section === "events" && <PortalEventsPanel />}
              {section === "achievements" && <PortalAchievementsPanel />}
              {section === "stats" && <PortalStatsPanel employee={workspace.me} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
