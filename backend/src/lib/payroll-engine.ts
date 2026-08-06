import type {
  EmployeePayslip,
  PayrollCalculationInput,
  PayrollPolicies,
  PayrollRule,
  PayslipLine,
  AttendanceImpactLine,
  AttendanceImpactKind,
  LeaveImpactLine,
  DeductionPriorityItem,
} from "./payroll-engine-types";
import {
  earlyLeaveFallbackMinutes,
  resolveAbsenceCharge,
  resolveEarlyLeaveCap,
  resolveHalfDayCharge,
  resolveLateTierCharge,
  resolveMissingPunchCharge,
} from "./payroll-charge";

function roundAmount(
  value: number,
  mode: PayrollPolicies["autoRounding"]
): number {
  switch (mode) {
    case "nearest_1":
      return Math.round(value);
    case "nearest_5":
      return Math.round(value / 5) * 5;
    case "nearest_10":
      return Math.round(value / 10) * 10;
    default:
      return Math.round(value * 100) / 100;
  }
}

function allowancesTotal(input: PayrollCalculationInput): number {
  const a = input.profile.allowances;
  return (
    a.housing + a.transportation + a.meal + a.phone + a.other + a.shift
  );
}

function resolveRates(input: PayrollCalculationInput): {
  daily: number;
  hourly: number;
  hoursPerDay: number;
} {
  const base =
    input.profile.basicSalary +
    allowancesTotal(input) +
    input.profile.bonuses +
    input.profile.commission;
  const workingDays = Math.max(input.period.workingDays, 1);
  const minMinutes =
    input.schedule?.minimumWorkingMinutes ??
    input.policies.minimumWorkingMinutes;
  const hoursPerDay = Math.max(minMinutes / 60, 1);

  switch (input.profile.salaryType) {
    case "hourly":
      return {
        hourly: input.profile.basicSalary,
        daily: input.profile.basicSalary * hoursPerDay,
        hoursPerDay,
      };
    case "daily":
      return {
        daily: input.profile.basicSalary,
        hourly: input.profile.basicSalary / hoursPerDay,
        hoursPerDay,
      };
    case "weekly":
      return {
        daily: (input.profile.basicSalary * 4.33) / workingDays,
        hourly: (input.profile.basicSalary * 4.33) / workingDays / hoursPerDay,
        hoursPerDay,
      };
    case "monthly":
    default:
      return {
        daily: base / workingDays,
        hourly: base / workingDays / hoursPerDay,
        hoursPerDay,
      };
  }
}

function matchRule(
  rule: PayrollRule,
  ctx: {
    lateMinutes: number;
    lateOverGrace: number;
    absent: boolean;
    overtimeHours: number;
    weekendOvertime: number;
    holidayOvertime: number;
    halfDay: boolean;
    earlyLeave: boolean;
    nightShift: boolean;
  }
): boolean {
  if (!rule.enabled) return false;
  const { field, operator, value } = rule.when;
  let actual = 0;
  switch (field) {
    case "late_minutes":
      actual = ctx.lateMinutes;
      break;
    case "late_over_grace":
      actual = ctx.lateOverGrace;
      break;
    case "absent":
      actual = ctx.absent ? 1 : 0;
      break;
    case "overtime_hours":
      actual = ctx.overtimeHours;
      break;
    case "weekend_overtime":
      actual = ctx.weekendOvertime;
      break;
    case "holiday_overtime":
      actual = ctx.holidayOvertime;
      break;
    case "half_day":
      actual = ctx.halfDay ? 1 : 0;
      break;
    case "early_leave":
      actual = ctx.earlyLeave ? 1 : 0;
      break;
    case "night_shift":
      actual = ctx.nightShift ? 1 : 0;
      break;
  }
  switch (operator) {
    case "always":
      return true;
    case "gt":
      return actual > value;
    case "gte":
      return actual >= value;
    case "lt":
      return actual < value;
    case "lte":
      return actual <= value;
    case "eq":
      return actual === value;
    default:
      return false;
  }
}

function applyRuleAmount(
  rule: PayrollRule,
  rate: number,
  hourly: number,
  hours?: number,
  /** When set, `deduct_minutes` uses actual minutes instead of the rule's fixed amount. */
  actualMinutes?: number,
  hoursPerDay = 8,
  shiftAllowanceAmount?: number
): { dayFraction: number; amount: number; kind: "deduct" | "earn" } {
  const { action, amount } = rule.then;
  switch (action) {
    case "deduct_day_fraction":
      return { dayFraction: amount, amount: rate * amount, kind: "deduct" };
    case "deduct_fixed":
      return { dayFraction: amount / Math.max(rate, 1), amount, kind: "deduct" };
    case "deduct_percent_daily":
      return {
        dayFraction: amount / 100,
        amount: rate * (amount / 100),
        kind: "deduct",
      };
    case "deduct_minutes": {
      const minutes = actualMinutes ?? amount;
      const minutesPerDay = Math.max(hoursPerDay * 60, 1);
      return {
        dayFraction: minutes / minutesPerDay,
        amount: hourly * (minutes / 60),
        kind: "deduct",
      };
    }
    case "pay_overtime_rate":
      return {
        dayFraction: 0,
        amount: (hours ?? 0) * hourly * amount,
        kind: "earn",
      };
    case "add_shift_allowance":
      return {
        dayFraction: 0,
        amount: shiftAllowanceAmount ?? amount,
        kind: "earn",
      };
    case "skip":
    default:
      return { dayFraction: 0, amount: 0, kind: "deduct" };
  }
}

/** Late / early minutes on attendance rows are already net of check-in grace. */
function minutesDeductionFromPolicy(
  minutes: number,
  policies: PayrollPolicies,
  rate: number,
  hourly: number,
  hoursPerDay: number,
  kind: "late" | "early"
): { dayFraction: number; amount: number; minutes: number; label: string } | null {
  if (minutes <= 0) return null;
  const minutesPerDay = Math.max(hoursPerDay * 60, 1);

  if (kind === "late") {
    const tiers = [...(policies.late.tiers ?? [])].sort(
      (a, b) => b.afterMinutes - a.afterMinutes
    );
    const tier = tiers.find((t) => minutes >= t.afterMinutes);
    if (tier) {
      const hit = resolveLateTierCharge(tier, rate);
      return {
        dayFraction: hit.dayFraction,
        amount: hit.amount,
        minutes,
        label: `late_tier_${tier.afterMinutes}`,
      };
    }
  }

  const byMinutes = {
    dayFraction: minutes / minutesPerDay,
    amount: hourly * (minutes / 60),
    minutes,
    label: kind === "late" ? "late_minutes" : "early_leave_minutes",
  };

  if (kind === "early") {
    const cap = resolveEarlyLeaveCap(policies, rate);
    if (byMinutes.amount > cap.amount) {
      return {
        dayFraction: cap.dayFraction,
        amount: cap.amount,
        minutes,
        label: "early_leave",
      };
    }
  }

  return byMinutes;
}

const BUILTIN_DAY_RULE_FIELDS = new Set([
  "late_minutes",
  "late_over_grace",
  "absent",
  "half_day",
  "early_leave",
]);

function enabledBuiltinFields(rules: PayrollRule[]): Set<string> {
  const fields = new Set<string>();
  for (const rule of rules) {
    if (rule.enabled && BUILTIN_DAY_RULE_FIELDS.has(rule.when.field)) {
      fields.add(rule.when.field);
    }
  }
  return fields;
}

function impactKindForRuleField(
  field: string
): AttendanceImpactKind {
  switch (field) {
    case "absent":
      return "absence";
    case "half_day":
      return "half_day";
    case "early_leave":
      return "early_leave";
    case "night_shift":
      return "night_shift";
    case "late_minutes":
    case "late_over_grace":
    default:
      return "late";
  }
}

function orderDeductions(
  buckets: Record<DeductionPriorityItem, number>,
  priority: DeductionPriorityItem[],
  cap: number
): { total: number; applied: Record<DeductionPriorityItem, number> } {
  const applied = { ...buckets };
  let remaining = cap;
  let total = 0;
  for (const key of priority) {
    const take = Math.min(applied[key] ?? 0, remaining);
    applied[key] = take;
    total += take;
    remaining -= take;
  }
  for (const key of Object.keys(applied) as DeductionPriorityItem[]) {
    if (!priority.includes(key)) {
      const take = Math.min(applied[key], remaining);
      applied[key] = take;
      total += take;
      remaining -= take;
    }
  }
  return { total, applied };
}

/** Pure payroll engine — no UI, no IO. NestJS-portable. */
export function calculateEmployeePayslip(
  input: PayrollCalculationInput
): EmployeePayslip {
  const { daily: rate, hourly, hoursPerDay } = resolveRates(input);
  const policies = input.policies;
  const rules = [...input.rules].sort((a, b) => a.priority - b.priority);

  const attendanceImpacts: AttendanceImpactLine[] = [];
  let attendanceDeduction = 0;
  let overtimePay = 0;
  let shiftAllowance = input.profile.allowances.shift;

  const overtimeHours = input.overtimeHours ?? 0;
  const weekendOt = input.weekendOvertimeHours ?? 0;
  const holidayOt = input.holidayOvertimeHours ?? 0;

  const isPeriodRuleField = (field: string) =>
    field === "overtime_hours" ||
    field === "weekend_overtime" ||
    field === "holiday_overtime";

  const dayRules = rules.filter((r) => !isPeriodRuleField(r.when.field));
  const periodRules = rules.filter((r) => isPeriodRuleField(r.when.field));
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

  // Period-level OT / weekend / holiday rules run once (not per attendance day).
  const periodCtx = {
    lateMinutes: 0,
    lateOverGrace: 0,
    absent: false,
    overtimeHours,
    weekendOvertime: weekendOt,
    holidayOvertime: holidayOt,
    halfDay: false,
    earlyLeave: false,
    nightShift: false,
  };
  for (const rule of periodRules) {
    if (!matchRule(rule, periodCtx)) continue;
    const otHours =
      rule.when.field === "weekend_overtime"
        ? weekendOt
        : rule.when.field === "holiday_overtime"
          ? holidayOt
          : overtimeHours;
    // Admin Policies OT rates are the source of truth when set.
    const rateMul =
      rule.when.field === "weekend_overtime"
        ? policies.weekendOvertimeRate
        : rule.when.field === "holiday_overtime"
          ? policies.holidayOvertimeRate
          : policies.overtimeRate;
    const applied = applyRuleAmount(
      {
        ...rule,
        then: {
          ...rule.then,
          amount: rateMul > 0 ? rateMul : rule.then.amount,
        },
      },
      rate,
      hourly,
      otHours,
      undefined,
      hoursPerDay,
      policies.nightShiftAllowance
    );
    if (applied.kind === "earn" && applied.amount > 0) {
      overtimePay += applied.amount;
    }
  }

  if (overtimePay === 0 && overtimeHours > 0) {
    overtimePay += overtimeHours * hourly * policies.overtimeRate;
  }
  if (weekendOt > 0) {
    // Avoid double-counting if a period rule already paid weekend OT.
    const weekendRuleHit = periodRules.some(
      (r) => r.enabled && r.when.field === "weekend_overtime" && matchRule(r, periodCtx)
    );
    if (!weekendRuleHit) {
      overtimePay += weekendOt * hourly * policies.weekendOvertimeRate;
    }
  }
  if (holidayOt > 0) {
    const holidayRuleHit = periodRules.some(
      (r) => r.enabled && r.when.field === "holiday_overtime" && matchRule(r, periodCtx)
    );
    if (!holidayRuleHit) {
      overtimePay += holidayOt * hourly * policies.holidayOvertimeRate;
    }
  }

  const maxAtt =
    policies.maxDeductionDayFraction * input.period.workingDays * rate;
  attendanceDeduction = Math.min(attendanceDeduction, maxAtt);

  const leaveImpacts: LeaveImpactLine[] = [];
  let leaveDeduction = 0;
  for (const leave of input.leaves) {
    if (leave.status !== "approved") continue;
    const behavior =
      policies.leaveBehavior[leave.type] ??
      (leave.type === "unpaid" ? "unpaid" : "full_pay");
    const paidFrac =
      behavior === "full_pay"
        ? 1
        : behavior === "unpaid"
          ? 0
          : (policies.leavePayFraction[leave.type] ?? 0.5);
    const amount = leave.days * (1 - paidFrac) * rate;
    leaveDeduction += amount;
    leaveImpacts.push({
      id: `lv-${leave.id}`,
      employeeId: input.profile.employeeId,
      leaveRequestId: leave.id,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      behavior,
      dayFractionPaid: paidFrac,
      amount,
      label: `${leave.type} leave`,
    });
  }

  const allowTotal = allowancesTotal(input) - input.profile.allowances.shift + shiftAllowance;
  const bonusesTotal = input.profile.bonuses + input.profile.commission;
  const incentives = input.profile.incentives;
  const manualAdjustments = input.profile.manualAdjustments;

  const gross =
    input.profile.basicSalary +
    allowTotal +
    bonusesTotal +
    incentives +
    manualAdjustments +
    overtimePay;

  const buckets: Record<DeductionPriorityItem, number> = {
    attendance: attendanceDeduction,
    leave: leaveDeduction,
    loan: input.profile.deductions.loan,
    advance: input.profile.deductions.advances,
    insurance: input.profile.deductions.insurance,
    tax: input.profile.deductions.tax,
    recurring: input.profile.deductions.recurring,
    penalty: input.profile.deductions.penalties,
  };

  const { total: deductionsTotal, applied } = orderDeductions(
    buckets,
    policies.deductionPriority,
    policies.monthlyDeductionCap
  );

  const net = roundAmount(gross - deductionsTotal, policies.autoRounding);
  const employeeCost = roundAmount(deductionsTotal, policies.autoRounding);
  const employerContribution = roundAmount(
    input.profile.basicSalary * 0.15 + input.profile.deductions.insurance * 0.5,
    policies.autoRounding
  );
  const employerCost = roundAmount(net + employerContribution, policies.autoRounding);

  const lines: PayslipLine[] = (
    [
      {
        id: "basic",
        code: "BASIC",
        label: "Basic salary",
        category: "earning",
        amount: input.profile.basicSalary,
      },
      {
        id: "housing",
        code: "HOUSING",
        label: "Housing allowance",
        category: "allowance",
        amount: input.profile.allowances.housing,
      },
      {
        id: "transport",
        code: "TRANS",
        label: "Transportation",
        category: "allowance",
        amount: input.profile.allowances.transportation,
      },
      {
        id: "meal",
        code: "MEAL",
        label: "Meal allowance",
        category: "allowance",
        amount: input.profile.allowances.meal,
      },
      {
        id: "phone",
        code: "PHONE",
        label: "Phone allowance",
        category: "allowance",
        amount: input.profile.allowances.phone,
      },
      {
        id: "other-allow",
        code: "OTHER",
        label: "Other allowances",
        category: "allowance",
        amount: input.profile.allowances.other,
      },
      {
        id: "shift",
        code: "SHIFT",
        label: "Shift allowance",
        category: "allowance",
        amount: shiftAllowance,
      },
      {
        id: "bonus",
        code: "BONUS",
        label: "Bonuses",
        category: "bonus",
        amount: input.profile.bonuses,
      },
      {
        id: "commission",
        code: "COMM",
        label: "Commission",
        category: "bonus",
        amount: input.profile.commission,
      },
      {
        id: "incentive",
        code: "INC",
        label: "Incentives",
        category: "incentive",
        amount: incentives,
      },
      {
        id: "adj",
        code: "ADJ",
        label: "Manual adjustments",
        category: "adjustment",
        amount: manualAdjustments,
      },
      {
        id: "ot",
        code: "OT",
        label: "Overtime",
        category: "overtime",
        amount: roundAmount(overtimePay, policies.autoRounding),
      },
      {
        id: "att-ded",
        code: "ATT",
        label: "Attendance deductions",
        category: "deduction",
        amount: -roundAmount(applied.attendance, policies.autoRounding),
      },
      {
        id: "leave-ded",
        code: "LEAVE",
        label: "Leave deductions",
        category: "deduction",
        amount: -roundAmount(applied.leave, policies.autoRounding),
      },
      {
        id: "insurance",
        code: "INS",
        label: "Insurance",
        category: "insurance",
        amount: -applied.insurance,
      },
      {
        id: "tax",
        code: "TAX",
        label: "Tax",
        category: "tax",
        amount: -applied.tax,
      },
      {
        id: "loan",
        code: "LOAN",
        label: "Loan",
        category: "loan",
        amount: -applied.loan,
      },
      {
        id: "adv",
        code: "ADV",
        label: "Advances",
        category: "advance",
        amount: -applied.advance,
      },
      {
        id: "recurring",
        code: "REC",
        label: "Recurring deductions",
        category: "deduction",
        amount: -applied.recurring,
      },
      {
        id: "penalty",
        code: "PEN",
        label: "Penalties",
        category: "penalty",
        amount: -applied.penalty,
      },
    ] as PayslipLine[]
  ).filter((l) => l.amount !== 0);

  return {
    id: `payslip-${input.profile.employeeId}-${input.period.id}`,
    employeeId: input.profile.employeeId,
    periodId: input.period.id,
    currency: input.profile.currency || policies.currency,
    gross: roundAmount(gross, policies.autoRounding),
    allowancesTotal: roundAmount(allowTotal, policies.autoRounding),
    bonusesTotal,
    incentives,
    manualAdjustments,
    overtimePay: roundAmount(overtimePay, policies.autoRounding),
    shiftAllowance: roundAmount(shiftAllowance, policies.autoRounding),
    deductionsTotal: employeeCost,
    insurance: applied.insurance,
    tax: applied.tax,
    loans: applied.loan,
    advances: applied.advance,
    penalties: applied.penalty,
    attendanceDeductions: roundAmount(applied.attendance, policies.autoRounding),
    leaveDeductions: roundAmount(applied.leave, policies.autoRounding),
    net,
    employeeCost,
    employerCost,
    lines,
    attendanceImpacts,
    leaveImpacts,
    dailyRate: roundAmount(rate, policies.autoRounding),
    hourlyRate: roundAmount(hourly, policies.autoRounding),
  };
}

export function formatEgp(
  amount: number,
  locale = "en",
  currency = "EGP"
): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
