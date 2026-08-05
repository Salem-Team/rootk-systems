# Sprint 10 — Enterprise Payroll Engine & HR Financial Integration

## Status

Frontend-complete on mock data. No NestJS backend. No routing/architecture redesign.

## 1. Files created

| Path | Role |
|------|------|
| `src/types/payroll.ts` | Domain types (NestJS-ready) |
| `src/lib/payroll/engine.ts` | Pure calculation engine (no UI / no IO) |
| `src/lib/payroll/index.ts` | Public engine exports |
| `src/mocks/payroll.ts` | Policies, rules, profiles, timeline, calendar, history |
| `src/services/payroll.service.ts` | NestJS-shaped façade + schedule/attendance/leave wiring |
| `src/components/payroll/*` | Workspace, KPIs, breakdown, profile, policies, rules, workflow, reports, timeline, payslip history |
| `src/app/(app)/payroll/page.tsx` | `/payroll` route |
| `docs/SPRINT10_DELIVERABLE.md` | This deliverable |

## 2. Files modified

| Path | Change |
|------|--------|
| `src/types/index.ts` | Re-export payroll types |
| `src/services/index.ts` | Export payroll service |
| `src/constants/navigation.ts` | Payroll nav item |
| `src/i18n/locales/en.ts` / `ar.ts` | Payroll + financial integration strings |

## 3. Payroll Engine architecture

```
Attendance / Leave / Work Schedule (repos)
            ↓
payroll.service (maps → PayrollCalculationInput)
            ↓
lib/payroll/engine.calculateEmployeePayslip()  ← pure
            ↓
EmployeePayslip (lines, impacts, net, employerCost…)
            ↓
UI panels (consume results only — no salary math)
```

Engine supports: basic, allowances, bonuses, commissions, incentives, penalties, recurring deductions, insurance, tax, loans, advances, manual adjustments, overtime (weekday/weekend/holiday), shift allowance, gross/net, employee cost, employer cost, deduction priority + monthly cap, salary types monthly/daily/hourly/weekly.

## 4. Salary calculation workflow

1. Load salary profile + policies + rules + period.
2. Resolve `SchedulePayrollContext` from work schedule (grace, break, hours).
3. Filter attendance/leave for the period.
4. Evaluate IF→THEN rules (late over grace, absence, half day, night shift, OT multipliers…).
5. Apply leave payroll behavior (full / partial / unpaid / statutory).
6. Order deductions by configured priority under monthly cap.
7. Round and emit payslip lines + attendance/leave impact previews.

## 5. Attendance integration

Each attendance row can emit impact lines for late, early leave, absence, half day, missing check-in/out, WFH, business trip, night shift, overtime. Amounts come from rules/policies — not UI.

## 6. Leave integration

Approved leave mapped via `PayrollLeaveType` + configurable `leaveBehavior` / `leavePayFraction` (annual, sick, unpaid, maternity, emergency, compassionate, paternity, study, …).

## 7. Work Schedule integration

`scheduleRepository.get()` → grace minutes, weekend days, break, from/to, derived minimum working minutes feed the engine rates and late-over-grace rules.

## 8. Payroll Rules architecture

Visual priority-ordered rules in `PayrollRulesEngine`. Fields include `late_over_grace`, `night_shift`, etc. Actions include `deduct_minutes`, `deduct_day_fraction`, `pay_overtime_rate`, `add_shift_allowance`. Toggle enable/disable without hardcoding business logic in components.

## 9. Approval workflow

`draft → hr_review → finance_review → approved → paid` via `advancePayrollStatus()`. Personas: Employee / Manager / HR / Finance / Admin (HR/Finance/Manager are admin UI personas).

## 10. Reports added

Department payroll (incl. employer cost), salary cost, overtime / attendance / leave cost, deduction analysis, monthly + yearly comparison charts.

## 11. Remaining backend work (NestJS — not implemented)

- Persist profiles, policies, rules, runs, payslips (Prisma).
- Replace mock OT / payslip history with real timesheets & ledger.
- AuthZ per persona (replace demo persona switcher).
- Bank file / payment export, statutory tax & insurance adapters.
- Idempotent payroll run generation + audit trail.
- Webhooks / notifications on approval stage changes.

## Absolute rule compliance

- No salary math inside UI components (profile panel shows engine `payslip.net` / `employerCost` only).
- Engine remains portable to NestJS without UI refactor.
