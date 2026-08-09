import type {
  AttendanceImpactLine,
  PayrollCalculationInput,
  PayrollPolicies,
  PayrollRule,
} from "@/types/payroll";
import {
  earlyLeaveFallbackMinutes,
  resolveAbsenceCharge,
  resolveHalfDayCharge,
  resolveMissingPunchCharge,
} from "@/lib/payroll/charge";
import { minutesDeductionFromPolicy } from "@/lib/payroll/engine-deductions";
import {
  applyRuleAmount,
  enabledBuiltinFields,
  impactKindForRuleField,
  matchRule,
} from "@/lib/payroll/engine-rules";

export function computeAttendanceImpacts(params: {
  input: PayrollCalculationInput;
  rate: number;
  hourly: number;
  hoursPerDay: number;
  policies: PayrollPolicies;
  dayRules: PayrollRule[];
}): {
  attendanceDeduction: number;
  attendanceImpacts: AttendanceImpactLine[];
  overtimePay: number;
  shiftAllowance: number;
} {
  const { input, rate, hourly, hoursPerDay, policies, dayRules } = params;
  const attendanceImpacts: AttendanceImpactLine[] = [];
  let attendanceDeduction = 0;
  let overtimePay = 0;
  let shiftAllowance = input.profile.allowances.shift;

  const builtinOverride = enabledBuiltinFields(dayRules);
  const lateRuleOverride =
    builtinOverride.has("late_minutes") ||
    builtinOverride.has("late_over_grace");
  const earlyRuleOverride = builtinOverride.has("early_leave");
  const absentRuleOverride = builtinOverride.has("absent");
  const halfDayRuleOverride = builtinOverride.has("half_day");

  // Enabled day rules — including builtins when admin turns them on (they override Policies).
  const activeDayRules = dayRules.filter((r) => r.enabled);

  for (const row of input.attendance) {
    const onLeave = row.status === "on_leave";
    // Attendance.lateMinutes is already net of check-in grace — do not subtract again.
    const lateMinutes = Math.max(0, row.lateMinutes);
    const earlyLeave = row.isEarlyLeave || row.status === "early_leave";

    if (row.status === "absent" && !onLeave && !absentRuleOverride) {
      const hit = resolveAbsenceCharge(policies, rate);
      attendanceDeduction += hit.amount;
      attendanceImpacts.push({
        id: `att-${row.date}-absence`,
        employeeId: input.profile.employeeId,
        date: row.date,
        kind: "absence",
        attendanceStatus: row.status,
        dayFraction: hit.dayFraction,
        amount: hit.amount,
        label: "absence",
      });
    } else if (row.status === "half_day") {
      if (!halfDayRuleOverride) {
        const hit = resolveHalfDayCharge(policies, rate);
        attendanceDeduction += hit.amount;
        attendanceImpacts.push({
          id: `att-${row.date}-half`,
          employeeId: input.profile.employeeId,
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

      if (!lateRuleOverride) {
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
            employeeId: input.profile.employeeId,
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
          (earlyLeave
            ? earlyLeaveFallbackMinutes(policies, hoursPerDay)
            : 0)
      );
      if (!earlyRuleOverride && (earlyLeave || earlyMinutes > 0)) {
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
            employeeId: input.profile.employeeId,
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
          impact.dayFraction =
            Math.round(impact.dayFraction * scale * 1000) / 1000;
        }
        dayDeduction = dayCap;
      }

      attendanceDeduction += dayDeduction;
      attendanceImpacts.push(...dayImpacts);
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
          rule.when.field === "late_minutes" ||
            rule.when.field === "late_over_grace"
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
            shiftAllowance += applied.amount;
          } else {
            overtimePay += applied.amount;
          }
          continue;
        }

        attendanceDeduction += applied.amount;
        attendanceImpacts.push({
          id: `att-${row.date}-${rule.id}`,
          employeeId: input.profile.employeeId,
          date: row.date,
          kind: impactKindForRuleField(rule.when.field),
          attendanceStatus: row.status,
          minutes:
            rule.when.field === "late_minutes" ||
            rule.when.field === "late_over_grace"
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
      attendanceDeduction += hit.amount;
      attendanceImpacts.push({
        id: `att-${row.date}-missing-in`,
        employeeId: input.profile.employeeId,
        date: row.date,
        kind: "missing_check_in",
        dayFraction: hit.dayFraction,
        amount: hit.amount,
        label: "missing_check_in",
      });
    }
    if (
      !skipMissingPunch &&
      row.checkIn &&
      !row.checkOut &&
      row.date !== input.asOfDate
    ) {
      const hit = resolveMissingPunchCharge(policies, rate);
      attendanceDeduction += hit.amount;
      attendanceImpacts.push({
        id: `att-${row.date}-missing-out`,
        employeeId: input.profile.employeeId,
        date: row.date,
        kind: "missing_check_out",
        dayFraction: hit.dayFraction,
        amount: hit.amount,
        label: "missing_check_out",
      });
    }
  }

  return { attendanceDeduction, attendanceImpacts, overtimePay, shiftAllowance };
}
