import type {
  AttendanceImpactLine,
  PayrollCalculationInput,
  PayrollPolicies,
  PayrollRule,
} from "./payroll-engine-types";
import {
  resolveAbsenceCharge,
  resolveHalfDayCharge,
  resolveMissingPunchCharge,
} from "./payroll-charge";
import {
  applyRuleAmount,
  earlyLeaveFallbackMinutes,
  matchRule,
  minutesDeductionFromPolicy,
} from "./payroll-engine-helpers";
import { impactKindForRuleField } from "./payroll-engine-deductions";

export interface DayRuleOverrides {
  late: boolean;
  early: boolean;
  absent: boolean;
  halfDay: boolean;
}

export interface DayAttendanceParams {
  row: PayrollCalculationInput["attendance"][number];
  employeeId: string;
  policies: PayrollPolicies;
  rate: number;
  hourly: number;
  hoursPerDay: number;
  asOfDate?: string;
  activeDayRules: PayrollRule[];
  overrides: DayRuleOverrides;
}

export interface DayAttendanceResult {
  impacts: AttendanceImpactLine[];
  deduction: number;
  shiftAllowanceAdd: number;
  overtimePayAdd: number;
}

/**
 * Computes a single attendance day's deductions/impacts: absence, half-day,
 * late/early minutes, custom day rules, and missing-punch charges.
 * Extracted from `computeAttendanceAndOvertime` — pure, no behavior change.
 */
export function computeDayAttendanceImpacts(
  params: DayAttendanceParams
): DayAttendanceResult {
  const { row, employeeId, policies, rate, hourly, hoursPerDay, asOfDate, activeDayRules, overrides } =
    params;

  const impacts: AttendanceImpactLine[] = [];
  let deduction = 0;
  let shiftAllowanceAdd = 0;
  let overtimePayAdd = 0;

  const onLeave = row.status === "on_leave";
  // Attendance.lateMinutes is already net of check-in grace — do not subtract again.
  const lateMinutes = Math.max(0, row.lateMinutes);
  const earlyLeave = row.isEarlyLeave || row.status === "early_leave";

  if (row.status === "absent" && !onLeave && !overrides.absent) {
    const hit = resolveAbsenceCharge(policies, rate);
    deduction += hit.amount;
    impacts.push({
      id: `att-${row.date}-absence`,
      employeeId,
      date: row.date,
      kind: "absence",
      attendanceStatus: row.status,
      dayFraction: hit.dayFraction,
      amount: hit.amount,
      label: "absence",
    });
  } else if (row.status === "half_day") {
    if (!overrides.halfDay) {
      const hit = resolveHalfDayCharge(policies, rate);
      deduction += hit.amount;
      impacts.push({
        id: `att-${row.date}-half`,
        employeeId,
        date: row.date,
        kind: "half_day",
        attendanceStatus: row.status,
        dayFraction: hit.dayFraction,
        amount: hit.amount,
        label: "half_day",
      });
    }
  } else if (!onLeave && row.status !== "absent") {
    let dayDeduction = 0;
    const dayImpacts: AttendanceImpactLine[] = [];

    if (!overrides.late) {
      const lateHit = minutesDeductionFromPolicy(
        lateMinutes,
        policies,
        rate,
        hourly,
        hoursPerDay,
        "late"
      );
      if (lateHit) {
        dayDeduction += lateHit.amount;
        dayImpacts.push({
          id: `att-${row.date}-late`,
          employeeId,
          date: row.date,
          kind: "late",
          attendanceStatus: row.status,
          minutes: lateHit.minutes,
          dayFraction: lateHit.dayFraction,
          amount: lateHit.amount,
          label: lateHit.label,
        });
      }
    }

    const earlyMinutes = Math.max(
      0,
      row.earlyLeaveMinutes ??
        (earlyLeave ? earlyLeaveFallbackMinutes(policies, hoursPerDay) : 0)
    );
    if (!overrides.early && (earlyLeave || earlyMinutes > 0)) {
      const earlyHit = minutesDeductionFromPolicy(
        earlyMinutes > 0
          ? earlyMinutes
          : earlyLeaveFallbackMinutes(policies, hoursPerDay),
        policies,
        rate,
        hourly,
        hoursPerDay,
        "early"
      );
      if (earlyHit) {
        dayDeduction += earlyHit.amount;
        dayImpacts.push({
          id: `att-${row.date}-early`,
          employeeId,
          date: row.date,
          kind: "early_leave",
          attendanceStatus: row.status,
          minutes: earlyHit.minutes,
          dayFraction: earlyHit.dayFraction,
          amount: earlyHit.amount,
          label: earlyHit.label,
        });
      }
    }

    // Cap combined late + early for a single day.
    const dayCap = rate * policies.maxDeductionDayFraction;
    if (dayDeduction > dayCap && dayImpacts.length > 0) {
      const scale = dayCap / dayDeduction;
      for (const impact of dayImpacts) {
        impact.amount = Math.round(impact.amount * scale * 100) / 100;
        impact.dayFraction = Math.round(impact.dayFraction * scale * 1000) / 1000;
      }
      dayDeduction = dayCap;
    }

    deduction += dayDeduction;
    impacts.push(...dayImpacts);
  }

  // Day rules (custom + enabled builtins). Skip leave days for deductions.
  const ctx = {
    lateMinutes,
    lateOverGrace: lateMinutes,
    absent: row.status === "absent",
    overtimeHours: 0,
    weekendOvertime: 0,
    holidayOvertime: 0,
    halfDay: row.status === "half_day",
    earlyLeave,
    nightShift: Boolean(row.isNightShift),
  };

  if (!onLeave) {
    for (const rule of activeDayRules) {
      if (!matchRule(rule, ctx)) continue;
      const applied = applyRuleAmount(
        rule,
        rate,
        hourly,
        undefined,
        rule.when.field === "late_minutes" || rule.when.field === "late_over_grace"
          ? lateMinutes
          : rule.when.field === "early_leave"
            ? Math.max(
                0,
                row.earlyLeaveMinutes ??
                  (earlyLeave ? Math.round(hoursPerDay * 60 * 0.25) : 0)
              )
            : undefined,
        hoursPerDay,
        // Prefer rule amount when set; fall back to policy night allowance.
        rule.then.action === "add_shift_allowance"
          ? rule.then.amount || policies.nightShiftAllowance
          : policies.nightShiftAllowance
      );
      if (applied.amount === 0 && applied.dayFraction === 0) continue;

      if (applied.kind === "earn") {
        if (rule.then.action === "add_shift_allowance") {
          shiftAllowanceAdd += applied.amount;
        } else {
          overtimePayAdd += applied.amount;
        }
        continue;
      }

      deduction += applied.amount;
      impacts.push({
        id: `att-${row.date}-${rule.id}`,
        employeeId,
        date: row.date,
        kind: impactKindForRuleField(rule.when.field),
        attendanceStatus: row.status,
        minutes:
          rule.when.field === "late_minutes" || rule.when.field === "late_over_grace"
            ? lateMinutes
            : undefined,
        dayFraction: applied.dayFraction,
        amount: applied.amount,
        ruleId: rule.id,
        label: rule.name,
      });
    }
  }

  const skipMissingPunch =
    onLeave ||
    row.status === "absent" ||
    row.status === "half_day" ||
    row.status === "wfh" ||
    Boolean(row.isBusinessTrip);

  if (!skipMissingPunch && !row.checkIn) {
    const hit = resolveMissingPunchCharge(policies, rate);
    deduction += hit.amount;
    impacts.push({
      id: `att-${row.date}-missing-in`,
      employeeId,
      date: row.date,
      kind: "missing_check_in",
      dayFraction: hit.dayFraction,
      amount: hit.amount,
      label: "missing_check_in",
    });
  }
  if (!skipMissingPunch && row.checkIn && !row.checkOut && row.date !== asOfDate) {
    const hit = resolveMissingPunchCharge(policies, rate);
    deduction += hit.amount;
    impacts.push({
      id: `att-${row.date}-missing-out`,
      employeeId,
      date: row.date,
      kind: "missing_check_out",
      dayFraction: hit.dayFraction,
      amount: hit.amount,
      label: "missing_check_out",
    });
  }

  return { impacts, deduction, shiftAllowanceAdd, overtimePayAdd };
}
