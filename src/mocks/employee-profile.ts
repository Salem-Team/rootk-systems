import type { Employee } from "@/types";
import type {
  EmployeeProfileExtras,
  WorkMode,
} from "@/types/employee-profile";

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) % 1000;
  }
  return h;
}

/** Deterministic mock enrichment for local/demo profile panels. */
export function buildMockEmployeeProfileExtras(
  employee: Employee
): EmployeeProfileExtras {
  const seed = hashSeed(employee.id);
  const presentDays = 16 + (seed % 5);
  const lateDays = seed % 4;
  const absentDays = seed % 3;
  const workingHours = 140 + (seed % 30);
  const rate = Math.min(
    99,
    Math.round(
      ((presentDays + lateDays * 0.5) /
        Math.max(presentDays + lateDays + absentDays, 1)) *
        1000
    ) / 10
  );

  const hour = 8 + (seed % 2);
  const minute = ((seed * 7) % 50).toString().padStart(2, "0");

  const workMode: WorkMode =
    employee.location === "Remote"
      ? "remote"
      : seed % 3 === 0
        ? "hybrid"
        : "office";

  return {
    employmentType: employee.status === "inactive" ? "contract" : "full_time",
    workMode,
    emergencyContact: {
      name:
        seed % 2 === 0
          ? "Amira " + employee.name.split(" ").slice(-1)[0]
          : "Karim " + employee.name.split(" ").slice(-1)[0],
      relation: seed % 2 === 0 ? "spouse" : "sibling",
      phone: "+20 12" + String(10000000 + (seed % 8999999)).slice(0, 8),
    },
    performance: {
      score: 3.6 + (seed % 14) / 10,
      labelKey:
        seed % 3 === 0
          ? "employees.perfExceeds"
          : seed % 3 === 1
            ? "employees.perfMeets"
            : "employees.perfStrong",
      period: "Q2 2026",
    },
    attendance: {
      presentDays,
      lateDays,
      absentDays,
      workingHours,
      averageArrival: `${hour}:${minute}`,
      attendanceRate: rate,
    },
    leave: {
      remaining: 12 + (seed % 10),
      approved: 2 + (seed % 4),
      pending: seed % 3,
      recent: [
        {
          id: `${employee.id}-lv-1`,
          typeKey: "leaveTypes.annual",
          startDate: "2026-07-14",
          endDate: "2026-07-16",
          days: 3,
          status: "approved",
        },
        {
          id: `${employee.id}-lv-2`,
          typeKey: "leaveTypes.sick",
          startDate: "2026-06-02",
          endDate: "2026-06-02",
          days: 1,
          status: seed % 2 === 0 ? "approved" : "pending",
        },
      ],
    },
    activity: [
      {
        id: `${employee.id}-act-1`,
        type: "check_in",
        titleKey: "employees.actCheckIn",
        detailKey: "employees.actCheckInDetail",
        at: "2026-08-02T09:12:00",
      },
      {
        id: `${employee.id}-act-2`,
        type: "check_out",
        titleKey: "employees.actCheckOut",
        detailKey: "employees.actCheckOutDetail",
        at: "2026-08-01T17:48:00",
      },
      {
        id: `${employee.id}-act-3`,
        type: "leave_request",
        titleKey: "employees.actLeave",
        detailKey: "employees.actLeaveDetail",
        at: "2026-07-28T11:20:00",
      },
      {
        id: `${employee.id}-act-4`,
        type: "training",
        titleKey: "employees.actTraining",
        detailKey: "employees.actTrainingDetail",
        at: "2026-07-22T14:00:00",
      },
      {
        id: `${employee.id}-act-5`,
        type: "announcement",
        titleKey: "employees.actAnnouncement",
        detailKey: "employees.actAnnouncementDetail",
        at: "2026-07-18T09:05:00",
      },
      {
        id: `${employee.id}-act-6`,
        type: "profile_updated",
        titleKey: "employees.actProfile",
        detailKey: "employees.actProfileDetail",
        at: "2026-07-10T16:30:00",
      },
    ],
  };
}
