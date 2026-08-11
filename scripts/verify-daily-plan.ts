/**
 * Daily plan, daily report, team scope, and organic-ads matching — regression checks.
 * Run: npx tsx scripts/verify-daily-plan.ts
 */

import {
  findOverlappingSlots,
  parseHmMinutes,
  resolveDailyPlanNow,
  slotsOverlap,
  sortDailyPlanSlots,
} from "../src/lib/daily-plan";
import {
  buildDailyReportFacts,
  formatWorkedHours,
  isInDateRange,
  isInDay,
  isValidReportDate,
} from "../src/lib/daily-report";
import { assembleEmployeeActivityRows } from "../src/lib/employee-activity";
import {
  clampOrganicAdsQuantity,
  isOrganicAdsLinkableTask,
  isOrganicAdsType,
  ORGANIC_ADS_LOCAL_TYPE_ID,
} from "../src/lib/organic-ads-task-match";
import { canAssignToTeam, directReportIds, findDirectReports } from "../src/lib/team";
import { dailyPlanSeed } from "../src/mocks/daily-plan";
import { saveDailyPlanSchema } from "../src/schemas/daily-plan.schema";
import type { DailyPlanSlot } from "../src/types/daily-plan";
import type { Employee } from "../src/types";

let failed = 0;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

function slot(
  id: string,
  title: string,
  startTime: string,
  endTime: string,
  sortOrder = 0
): DailyPlanSlot {
  return {
    id,
    planId: "p1",
    title,
    description: "",
    startTime,
    endTime,
    sortOrder,
    companyId: "c1",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}

function at(hours: number, minutes = 0): Date {
  return new Date(2026, 7, 2, hours, minutes, 0, 0);
}

function emp(
  id: string,
  name: string,
  managerEmployeeId?: string | string[]
): Employee {
  const managerEmployeeIds = Array.isArray(managerEmployeeId)
    ? managerEmployeeId
    : managerEmployeeId
      ? [managerEmployeeId]
      : [];
  return {
    id,
    employeeId: id,
    name,
    email: `${id}@rootk.systems`,
    phone: "",
    department: "Engineering",
    position: "Engineer",
    status: "active",
    joinDate: "2026-01-01",
    location: "Cairo",
    managerEmployeeId: managerEmployeeIds[0],
    managerEmployeeIds,
    companyId: "c1",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}

function main() {
  assert(parseHmMinutes("09:30") === 9 * 60 + 30, "parse 09:30");
  assert(parseHmMinutes("9:30") == null, "reject unpadded time");
  assert(parseHmMinutes("24:00") == null, "reject 24:00");
  assert(parseHmMinutes("") == null, "reject empty time");

  assert(
    !slotsOverlap(
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "10:00", endTime: "11:00" }
    ),
    "adjacent blocks do not overlap"
  );
  assert(
    slotsOverlap(
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "09:30", endTime: "10:30" }
    ),
    "overlapping blocks detected"
  );

  const overlapIds = findOverlappingSlots([
    { id: "a", startTime: "09:00", endTime: "10:00" },
    { id: "b", startTime: "09:45", endTime: "11:00" },
  ]);
  assert(overlapIds.includes("a") && overlapIds.includes("b"), "overlap ids listed");

  const ordered = sortDailyPlanSlots([
    slot("late", "B", "14:00", "15:00", 0),
    slot("early", "A", "09:00", "10:00", 1),
  ]);
  assert(ordered[0].id === "early", "sort by start time");

  const seedOverlap = findOverlappingSlots(dailyPlanSeed.slots);
  assert(seedOverlap.length === 0, "seed daily plan has no overlaps");

  const empty = resolveDailyPlanNow([], at(10));
  assert(empty.phase === "empty", "empty plan phase");

  const plan = dailyPlanSeed.slots;
  assert(resolveDailyPlanNow(plan, at(8)).phase === "before", "before first block");
  assert(resolveDailyPlanNow(plan, at(8)).next?.title === "Morning standup", "next is standup");

  const live = resolveDailyPlanNow(plan, at(9, 15));
  assert(live.phase === "current" && live.current?.title === "Morning standup", "live standup");
  assert(live.progress > 0 && live.progress < 1, "standup progress mid-block");

  const focus = resolveDailyPlanNow(plan, at(9, 30));
  assert(focus.current?.title === "Focus work", "handoff at block end is next block");

  const betweenLunch = resolveDailyPlanNow(
    [slot("a", "A", "09:00", "10:00"), slot("b", "B", "12:00", "13:00")],
    at(11)
  );
  assert(betweenLunch.phase === "between", "gap between blocks");
  assert(betweenLunch.next?.id === "b" && betweenLunch.previous?.id === "a", "between pointers");

  const after = resolveDailyPlanNow(plan, at(18));
  assert(after.phase === "after" && after.previous?.title === "Wrap-up", "after last block");

  const parsed = saveDailyPlanSchema.safeParse({
    title: "Daily Plan",
    slots: [{ title: "Standup", startTime: "9:00", endTime: "09:30" }],
  });
  assert(parsed.success, "schema accepts padded transform");
  if (parsed.success) {
    assert(parsed.data.slots[0].startTime === "09:00", "schema pads 9:00 → 09:00");
  }
  assert(
    !saveDailyPlanSchema.safeParse({
      slots: [{ title: "X", startTime: "25:00", endTime: "10:00" }],
    }).success,
    "schema rejects invalid clock"
  );

  assert(isValidReportDate("2026-08-02"), "valid report date");
  assert(!isValidReportDate("02-08-2026"), "reject non-ISO date");
  assert(!isValidReportDate(""), "reject empty date");
  assert(isInDay("2026-08-02T10:00:00.000", "2026-08-02"), "ISO timestamp in day");
  assert(!isInDay("2026-08-01T10:00:00.000", "2026-08-02"), "ISO timestamp other day");
  assert(isInDay("2026-08-02", "2026-08-02"), "date-only in day");
  assert(!isInDay(null, "2026-08-02"), "null not in day");
  assert(
    isInDateRange("2026-08-03T09:00:00.000", "2026-08-02", "2026-08-04"),
    "timestamp in range"
  );
  assert(
    !isInDateRange("2026-08-01T09:00:00.000", "2026-08-02", "2026-08-04"),
    "timestamp before range"
  );

  assert(formatWorkedHours(0) === "—", "zero hours dash");
  assert(formatWorkedHours(45) === "45m", "minutes only");
  assert(formatWorkedHours(120) === "2h", "hours only");
  assert(formatWorkedHours(90) === "1h 30m", "hours and minutes");

  assert(
    buildDailyReportFacts({
      onLeave: true,
      attendanceStatus: "present",
      taskTitles: ["X"],
      adsCount: 2,
      crmCount: 0,
      meetingsCount: 0,
    })[0]?.kind === "leave",
    "leave overrides other facts"
  );
  assert(
    buildDailyReportFacts({
      onLeave: false,
      attendanceStatus: "absent",
      taskTitles: [],
      adsCount: 0,
      crmCount: 0,
      meetingsCount: 0,
    })[0]?.kind === "absent",
    "absent fact"
  );
  const mixed = buildDailyReportFacts({
    onLeave: false,
    attendanceStatus: "present",
    taskTitles: ["Ship ads", "Call lead"],
    adsCount: 3,
    crmCount: 1,
    meetingsCount: 0,
  });
  assert(
    mixed.some((f) => f.kind === "tasks" && f.count === 2) &&
      mixed.some((f) => f.kind === "ads" && f.count === 3),
    "tasks + ads facts"
  );
  const withCalls = buildDailyReportFacts({
    onLeave: false,
    attendanceStatus: "present",
    taskTitles: [],
    adsCount: 0,
    crmCount: 0,
    meetingsCount: 0,
    activeCalls: 4,
    inactiveCalls: 2,
  });
  assert(
    withCalls.some((f) => f.kind === "activeCalls" && f.count === 4) &&
      withCalls.some((f) => f.kind === "inactiveCalls" && f.count === 2),
    "active + inactive call facts"
  );

  const activity = assembleEmployeeActivityRows({
    employees: [{ id: "e1", name: "Ali", department: "Sales" }],
    from: "2026-08-11",
    to: "2026-08-11",
    attendance: [],
    tasks: [],
    ads: [],
    crm: [{ actorEmployeeId: "e1", occurredAt: "2026-08-11T08:00:00.000" }],
    feedback: [
      {
        recordedByEmployeeId: "e1",
        callAnswered: true,
        createdAt: "2026-08-11T10:00:00.000",
      },
      {
        recordedByEmployeeId: "e1",
        callAnswered: false,
        createdAt: "2026-08-11T11:00:00.000",
      },
      {
        recordedByEmployeeId: "e1",
        callAnswered: true,
        createdAt: "2026-08-10T10:00:00.000",
      },
    ],
    leaves: [],
    meetings: [],
  });
  assert(activity.length === 1, "activity one employee");
  assert(activity[0]?.crmActiveCalls === 1, "today active calls only");
  assert(activity[0]?.crmInactiveCalls === 1, "today inactive calls only");
  assert(activity[0]?.crmCount === 1, "today CRM activities");
  assert(
    buildDailyReportFacts({
      onLeave: false,
      attendanceStatus: "present",
      taskTitles: [],
      adsCount: 0,
      crmCount: 0,
      meetingsCount: 0,
    })[0]?.kind === "present",
    "present with no logged work"
  );

  const roster = [
    emp("mgr", "Mona"),
    emp("lead", "Layla"),
    emp("a", "Ali", ["mgr", "lead"]),
    emp("b", "Basma", "mgr"),
    emp("c", "Cyrus"),
  ];
  const reports = directReportIds("mgr", roster);
  assert(reports.includes("a") && reports.includes("b") && !reports.includes("c"), "direct reports");
  assert(
    findDirectReports("lead", roster).some((e) => e.id === "a") &&
      !findDirectReports("lead", roster).some((e) => e.id === "b"),
    "shared employee appears under both managers"
  );
  assert(
    canAssignToTeam({ role: "admin", employeeId: "c" }, ["a", "c"], roster),
    "admin can assign anyone"
  );
  assert(
    canAssignToTeam({ role: "employee", employeeId: "mgr" }, ["a"], roster),
    "manager can assign report"
  );
  assert(
    !canAssignToTeam({ role: "employee", employeeId: "mgr" }, ["c"], roster),
    "manager cannot assign outsider"
  );
  assert(
    !canAssignToTeam({ role: "employee", employeeId: "a" }, ["b"], roster),
    "peer cannot assign teammate"
  );

  assert(isOrganicAdsType({ id: ORGANIC_ADS_LOCAL_TYPE_ID }), "local ads type id");
  assert(isOrganicAdsType({ unit: "ads" }), "ads unit");
  assert(!isOrganicAdsType({ name: "Calls", unit: "calls" }), "calls is not ads");
  assert(isOrganicAdsLinkableTask({ title: "Organic Ad #3" }), "ads task title");
  assert(
    !isOrganicAdsLinkableTask({ title: "Fix login bug" }, { name: "Bugs", unit: "tickets" }),
    "bug task is not ads-linkable"
  );
  assert(clampOrganicAdsQuantity(0) === 1, "ads qty min 1");
  assert(clampOrganicAdsQuantity(99) === 50, "ads qty max 50");

  if (failed > 0) {
    console.error(`\nDaily plan checks failed: ${failed}`);
    process.exit(1);
  }
  console.log("\nAll daily-plan / report / team / ads checks passed.");
}

main();
