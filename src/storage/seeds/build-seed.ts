import { enrichWithAudit } from "@/lib/entity";
import { formatISO, subMinutes } from "date-fns";
import {
  activitiesSeed,
  announcementsSeed,
  approvalRulesSeed,
  attendanceRecordsSeed,
  companySettingsSeed,
  employeesSeed,
  jobPositionsSeed,
  leaveRequestsSeed,
  monthlyStatsSeed,
  notificationsSeed,
  officeLocationsSeed,
  orgDepartmentsSeed,
  shiftsSeed,
  userPreferencesSeed,
  usersSeed,
  weeklyStatsSeed,
  workMeetingsSeed,
  workScheduleSeed,
  workTasksSeed,
  targetCategoriesSeed,
  targetTypesSeed,
  targetTemplatesSeed,
  performanceTargetsSeed,
  targetWarningsSeed,
} from "@/mocks";
import { buildTaskTitle } from "@/lib/target-progress";
import { createId } from "@/lib/id";
import type {
  Activity,
  Announcement,
  AppNotification,
  AppUser,
  AttendanceRecord,
  CompanySettings,
  Employee,
  Holiday,
  LeaveRequest,
  MonthlyStat,
  PerformanceTarget,
  TargetCategory,
  TargetTemplate,
  TargetType,
  TargetWarning,
  WeeklyStat,
  WorkMeeting,
  WorkSchedule,
  WorkTask,
} from "@/types";
import type {
  ApprovalRule,
  JobPosition,
  OfficeLocation,
  OrgDepartment,
  ShiftDefinition,
} from "@/types/org";
import type { UserPreferences } from "@/types/preferences";

export interface SeedPayload {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leave: LeaveRequest[];
  schedule: WorkSchedule;
  settings: CompanySettings;
  activities: Activity[];
  announcements: Announcement[];
  weeklyStats: WeeklyStat[];
  monthlyStats: MonthlyStat[];
  notifications: AppNotification[];
  users: AppUser[];
  locations: OfficeLocation[];
  departments: OrgDepartment[];
  positions: JobPosition[];
  shifts: ShiftDefinition[];
  approvalRules: ApprovalRule[];
  userPreferences: UserPreferences[];
  workTasks: WorkTask[];
  workMeetings: WorkMeeting[];
  targetCategories: TargetCategory[];
  targetTypes: TargetType[];
  targetTemplates: TargetTemplate[];
  performanceTargets: PerformanceTarget[];
  targetWarnings: TargetWarning[];
}

export function buildSeedPayload(): SeedPayload {
  const holidays: Holiday[] = workScheduleSeed.holidays.map((h) =>
    enrichWithAudit(h, "system", {
      createdAt: `${h.date}T00:00:00.000Z`,
      updatedAt: `${h.date}T00:00:00.000Z`,
    })
  );

  return {
    employees: employeesSeed.map((e) =>
      enrichWithAudit(e, "system", {
        createdAt: `${e.joinDate}T00:00:00.000Z`,
        updatedAt: `${e.joinDate}T00:00:00.000Z`,
      })
    ),
    attendance: attendanceRecordsSeed.map((r) =>
      enrichWithAudit(r, r.employeeId, {
        createdAt: r.checkIn ?? `${r.date}T00:00:00.000Z`,
        updatedAt: r.checkOut ?? r.checkIn ?? `${r.date}T00:00:00.000Z`,
      })
    ),
    leave: leaveRequestsSeed.map((r) =>
      enrichWithAudit(r, r.employeeId, {
        createdAt: r.submittedAt,
        updatedAt: r.reviewedAt ?? r.submittedAt,
      })
    ),
    schedule: enrichWithAudit(
      {
        ...workScheduleSeed,
        holidays,
        metadata: {
          attendancePolicy: {
            minHours: 7,
            maxHours: 10,
            overtimeAfterHours: 9,
            lateAfterMinutes: 15,
            halfDayHours: 4,
          },
          wfhPolicy: {
            enabled: true,
            allowedDepartments: [
              "Engineering",
              "Design",
              "Product",
              "Marketing",
            ],
            requiresApproval: true,
            monthlyQuota: 8,
            hybridOfficeDays: 3,
          },
        },
      },
      "system"
    ),
    settings: enrichWithAudit(
      {
        ...companySettingsSeed,
        id: companySettingsSeed.id ?? "settings_rootk_001",
      },
      "system"
    ),
    activities: activitiesSeed.map((a) =>
      enrichWithAudit(a, a.employeeId ?? "system", {
        createdAt: a.timestamp,
        updatedAt: a.timestamp,
      })
    ),
    announcements: announcementsSeed.map((a) =>
      enrichWithAudit(
        {
          id: a.id,
          title: a.title,
          body: a.body,
          author: a.author,
          priority: a.priority,
        },
        "system",
        {
          createdAt: a.createdAt,
          updatedAt: a.createdAt,
        }
      )
    ),
    weeklyStats: weeklyStatsSeed.map((s) => enrichWithAudit(s, "system")),
    monthlyStats: monthlyStatsSeed.map((s) => enrichWithAudit(s, "system")),
    notifications: notificationsSeed.map((n) => {
      const { minutesAgo, ...rest } = n;
      const stamp = formatISO(subMinutes(new Date(), minutesAgo));
      return enrichWithAudit(rest, n.actorId ?? "system", {
        createdAt: stamp,
        updatedAt: stamp,
      });
    }),
    users: usersSeed.map((u) => enrichWithAudit(u, "system")),
    locations: officeLocationsSeed.map((l) => enrichWithAudit(l, "system")),
    departments: orgDepartmentsSeed.map((d) => enrichWithAudit(d, "system")),
    positions: jobPositionsSeed.map((p) => enrichWithAudit(p, "system")),
    shifts: shiftsSeed.map((s) => enrichWithAudit(s, "system")),
    approvalRules: approvalRulesSeed.map((r) => enrichWithAudit(r, "system")),
    userPreferences: userPreferencesSeed.map((p) => enrichWithAudit(p, "system")),
    workTasks: [
      ...workTasksSeed.map((t) => enrichWithAudit(t, "system")),
      ...buildTargetLinkedTasks(),
    ],
    workMeetings: workMeetingsSeed.map((m) => enrichWithAudit(m, "system")),
    targetCategories: targetCategoriesSeed,
    targetTypes: targetTypesSeed,
    targetTemplates: targetTemplatesSeed,
    performanceTargets: performanceTargetsSeed,
    targetWarnings: targetWarningsSeed,
  };
}

function buildTargetLinkedTasks(): WorkTask[] {
  const typeMap = new Map(targetTypesSeed.map((t) => [t.id, t]));
  const tasks: WorkTask[] = [];
  for (const target of performanceTargetsSeed) {
    const type = typeMap.get(target.typeId);
    if (!type) continue;
    for (let i = 1; i <= target.quantity; i++) {
      const done = i <= target.completedQuantity;
      tasks.push(
        enrichWithAudit(
          {
            id: createId("task"),
            title: buildTaskTitle(type.taskTitleTemplate, type.name, i),
            description: `Linked to target: ${target.title}`,
            status: done ? "completed" : "todo",
            priority:
              target.priority === "critical" || target.priority === "high"
                ? "high"
                : target.priority === "low"
                  ? "low"
                  : "medium",
            dueDate: target.endDate,
            tag: type.name,
            estimateMin: 0,
            assigneeIds: target.assigneeIds,
            targetId: target.id,
            subItems: [],
            origin: "assigned",
          },
          "system"
        )
      );
    }
  }
  return tasks;
}
