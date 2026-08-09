"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { NotificationFeed } from "@/components/notifications/notification-feed";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ManagerCard,
  MyTeamCard,
} from "@/components/dashboard/manager-team-panel";
import {
  buildPortalDocuments,
  buildPortalRequests,
} from "@/components/portal/portal-mock-data";
import { useEmployeeProfileExtras } from "@/hooks/use-employee-profile-extras";
import { useNotifications } from "@/hooks/use-notifications";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { Employee } from "@/types";
import type { TranslationPath } from "@/i18n";

export function PortalRequestsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const requests = buildPortalRequests();

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="grid gap-3 sm:grid-cols-2"
    >
      {requests.map((req) => (
        <motion.li
          key={req.id}
          variants={fadeInUp}
          className="surface-panel surface-panel-interactive p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t(req.titleKey)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{req.detail}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("portal.submittedOn", { date: req.submitted })}
              </p>
            </div>
            <StatusBadge status={req.status} />
          </div>
          <Badge variant="outline" className="mt-3 capitalize">
            {t(`portal.kind.${req.kind}` as TranslationPath)}
          </Badge>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function PortalDocumentsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const docs = buildPortalDocuments();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("portal.documentsDesc")}</p>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {docs.map((doc) => (
          <motion.li key={doc.id} variants={fadeInUp}>
            <button
              type="button"
              onClick={() => toast.message(t("portal.docUiOnly"))}
              className="surface-panel surface-panel-interactive flex w-full flex-col items-start gap-3 p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="icon-well">
                <FileText className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{t(doc.titleKey)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(doc.categoryKey)} · {doc.updated} · {doc.size}
                </p>
              </div>
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

export function PortalNotificationsPanel() {
  const { locale } = useTranslation();
  const userId = useSessionStore((s) => s.user.id);
  const { items, loading, markRead, markAllRead } = useNotifications();

  return (
    <div className="surface-panel overflow-hidden">
      <NotificationFeed
        items={items}
        userId={userId}
        locale={locale}
        loading={loading}
        maxHeight="min(420px, 60vh)"
        onRead={(id) => void markRead(id)}
        onMarkAll={() => void markAllRead()}
      />
    </div>
  );
}

export function PortalTeamPanel({
  manager,
  teammates,
}: {
  manager: Employee | null;
  teammates: Employee[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MyTeamCard teammates={teammates} />
      <ManagerCard manager={manager} />
    </div>
  );
}

export function PortalManagerPanel({ manager }: { manager: Employee | null }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <ManagerCard manager={manager} />
      <section className="surface-panel p-4">
        <h3 className="text-sm font-semibold">{t("portal.managerNotes")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("portal.managerNotesBody")}
        </p>
      </section>
    </div>
  );
}

export function PortalStatsPanel({ employee }: { employee: Employee }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const extras = useEmployeeProfileExtras(employee);
  if (!extras) return null;

  const rows = [
    {
      label: t("portal.statAttendanceRate"),
      value: `${extras.attendance.attendanceRate}%`,
      progress: extras.attendance.attendanceRate,
    },
    {
      label: t("portal.statHours"),
      value: `${extras.attendance.workingHours}h`,
      progress: Math.min(100, extras.attendance.workingHours / 1.8),
    },
    {
      label: t("portal.statLeaveHealth"),
      value: `${extras.leave.remaining} ${t("employeeHome.days")}`,
      progress: Math.min(100, extras.leave.remaining * 4),
    },
    {
      label: t("portal.statPerformance"),
      value: extras.performance.score.toFixed(1),
      progress: extras.performance.score * 20,
    },
  ];

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="grid gap-3 sm:grid-cols-2"
    >
      {rows.map((row) => (
        <motion.li key={row.label} variants={fadeInUp} className="surface-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{row.label}</p>
            <p className="font-semibold tabular-nums">{row.value}</p>
          </div>
          <Progress value={row.progress} className="mt-3 h-1.5" />
        </motion.li>
      ))}
    </motion.ul>
  );
}
