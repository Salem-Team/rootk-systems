"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatChip } from "@/components/shared/stat-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PayrollKpiRow } from "@/components/payroll/payroll-kpi-row";
import { PayrollTimeline } from "@/components/payroll/payroll-timeline";
import { SalaryProfilePanel } from "@/components/payroll/salary-profile-panel";
import { PayrollPoliciesPanel } from "@/components/payroll/payroll-policies-panel";
import { PayrollRulesEngine } from "@/components/payroll/payroll-rules-engine";
import { PayrollApprovalWorkflow } from "@/components/payroll/payroll-approval-workflow";
import { PayrollReportsPanel } from "@/components/payroll/payroll-reports-panel";
import { PayslipHistoryPanel } from "@/components/payroll/payslip-history-panel";
import { PayslipStatementView } from "@/components/payroll/payslip-statement";
import { formatEgp } from "@/lib/payroll";
import { formatHmDuration } from "@/lib/duration-format";
import {
  canApproveFinance,
  canEditPolicies,
  canViewAllPayroll,
  getAllPayslips,
  getEmployeePayslip,
  getPayrollDashboard,
  getPayrollPolicies,
  getPayrollReports,
  getPayrollRules,
  getPayslipHistory,
  getSalaryProfile,
  personaForRole,
} from "@/services/payroll.service";
import { getWorkforceEmployees } from "@/services/employees.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayrollDashboardSummary,
  PayrollPersona,
  PayrollPolicies,
  PayrollReportBundle,
  PayrollRule,
  PayrollRun,
  PayslipHistoryItem,
} from "@/types/payroll";

export function PayrollWorkspace() {
  const { t, locale } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const sessionUser = useSessionStore((s) => s.user);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [persona, setPersona] = useState<PayrollPersona>(() =>
    personaForRole(role)
  );
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PayrollDashboardSummary | null>(null);
  const [policies, setPolicies] = useState<PayrollPolicies | null>(null);
  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [payslips, setPayslips] = useState<EmployeePayslip[]>([]);
  const [myPayslip, setMyPayslip] = useState<EmployeePayslip | null>(null);
  const [myProfile, setMyProfile] = useState<EmployeeSalaryProfile | null>(null);
  const [myHistory, setMyHistory] = useState<PayslipHistoryItem[]>([]);
  const [reports, setReports] = useState<PayrollReportBundle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    setPersona(personaForRole(role));
  }, [role]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void (async () => {
      try {
        if (role === "employee") {
          const [dash, slip, profile, history, emp] = await Promise.all([
            getPayrollDashboard(),
            getEmployeePayslip(workEmployeeId),
            getSalaryProfile(workEmployeeId),
            getPayslipHistory(workEmployeeId),
            getWorkforceEmployees(),
          ]);
          if (!mounted) return;
          if (dash.success) setSummary(dash.data);
          if (slip.success) setMyPayslip(slip.data);
          if (profile.success) setMyProfile(profile.data);
          if (history.success) setMyHistory(history.data);
          if (emp.success) setEmployees(emp.data);
        } else {
          const [dash, pol, ruleRes, slips, rep, emp] = await Promise.all([
            getPayrollDashboard(),
            getPayrollPolicies(),
            getPayrollRules(),
            getAllPayslips(),
            getPayrollReports(),
            getWorkforceEmployees(),
          ]);
          if (!mounted) return;
          if (dash.success) setSummary(dash.data);
          if (pol.success) setPolicies(pol.data);
          if (ruleRes.success) setRules(ruleRes.data);
          if (slips.success) {
            setPayslips(slips.data);
            setSelectedEmployeeId((prev) =>
              prev && slips.data.some((p) => p.employeeId === prev)
                ? prev
                : (slips.data[0]?.employeeId ?? "")
            );
          }
          if (rep.success) setReports(rep.data);
          if (emp.success) setEmployees(emp.data);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [role, workEmployeeId]);

  async function refreshPayrollCalculations() {
    const [dash, slips, rep, ruleRes] = await Promise.all([
      getPayrollDashboard(),
      getAllPayslips(),
      getPayrollReports(),
      getPayrollRules(),
    ]);
    if (dash.success) setSummary(dash.data);
    if (slips.success) setPayslips(slips.data);
    if (rep.success) setReports(rep.data);
    if (ruleRes.success) setRules(ruleRes.data);
  }

  const selectedPayslip = useMemo(
    () => payslips.find((p) => p.employeeId === selectedEmployeeId) ?? null,
    [payslips, selectedEmployeeId]
  );

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const myEmployee = useMemo(
    () =>
      employees.find((e) => e.id === workEmployeeId) ??
      ({
        name: t(sessionUser.nameKey),
        employeeId: workEmployeeId,
        department: "Operations" as Employee["department"],
        email: sessionUser.email,
      } satisfies Pick<Employee, "name" | "employeeId" | "department" | "email">),
    [employees, workEmployeeId, sessionUser, t]
  );

  const [selectedProfileState, setSelectedProfileState] =
    useState<EmployeeSalaryProfile | null>(null);

  useEffect(() => {
    if (!selectedEmployeeId || role === "employee") return;
    let mounted = true;
    void getSalaryProfile(selectedEmployeeId).then((res) => {
      if (mounted && res.success) setSelectedProfileState(res.data);
    });
    return () => {
      mounted = false;
    };
  }, [selectedEmployeeId, role]);

  if (loading) return <PageSkeleton />;

  if (role === "employee") {
    if (!myPayslip || !myProfile || !summary) {
      return (
        <EmptyState
          title={t("common.error")}
          description={t("payroll.loadFailed")}
        />
      );
    }
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          className="mb-4 sm:mb-7"
          eyebrow={t("payroll.eyebrow")}
          title={t("payroll.myTitle")}
          description={t("payroll.myDesc")}
        />
        <EmployeePayslipHero payslip={myPayslip} periodLabel={summary.period.label} />

        <div className="lg:hidden">
          <Tabs defaultValue="slip" className="space-y-4">
            <div className="sticky top-14 z-20 -mx-3 bg-background/90 px-3 py-2 backdrop-blur-xl sm:-mx-4 sm:px-4">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/60 bg-card p-1 shadow-sm sm:rounded-2xl">
                <TabsTrigger
                  value="slip"
                  className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:min-h-11 sm:rounded-xl sm:text-[12px]"
                >
                  {t("payroll.mobileTabSlip")}
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:min-h-11 sm:rounded-xl sm:text-[12px]"
                >
                  {t("payroll.mobileTabProfile")}
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="min-h-10 truncate rounded-lg px-1 text-[11px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:min-h-11 sm:rounded-xl sm:text-[12px]"
                >
                  {t("payroll.mobileTabHistory")}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="slip" className="mt-0 space-y-4">
              <PayslipStatementView
                payslip={myPayslip}
                profile={myProfile}
                employee={myEmployee}
                periodLabel={summary.period.label}
              />
              <ImpactLists payslip={myPayslip} />
            </TabsContent>
            <TabsContent value="profile" className="mt-0 space-y-4">
              <SalaryProfilePanel profile={myProfile} payslip={myPayslip} />
            </TabsContent>
            <TabsContent value="history" className="mt-0 space-y-4">
              <PayslipHistoryPanel items={myHistory} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden space-y-6 lg:block">
          <PayslipStatementView
            payslip={myPayslip}
            profile={myProfile}
            employee={myEmployee}
            periodLabel={summary.period.label}
          />
          <SalaryProfilePanel profile={myProfile} payslip={myPayslip} />
          <PayslipHistoryPanel items={myHistory} />
          <ImpactLists payslip={myPayslip} />
        </div>
      </div>
    );
  }

  if (!summary || !policies || !reports) {
    return (
      <EmptyState
        title={t("common.error")}
        description={t("payroll.loadFailed")}
      />
    );
  }

  const viewAll = canViewAllPayroll(persona);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("payroll.eyebrow")}
        title={t("payroll.title")}
        description={t("payroll.description")}
        actions={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("payroll.personaLabel")}>
            {(["admin", "hr", "finance", "manager"] as PayrollPersona[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersona(p)}
                  className="focus-ring rounded-md"
                >
                  <Badge variant={persona === p ? "default" : "outline"}>
                    {t(`payroll.persona.${p}`)}
                  </Badge>
                </button>
              )
            )}
          </div>
        }
      />

      <PayrollKpiRow summary={summary} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
          <TabsTrigger value="overview" className="shrink-0">
            {t("payroll.tabOverview")}
          </TabsTrigger>
          <TabsTrigger value="salary" className="shrink-0">
            {t("payroll.tabSalary")}
          </TabsTrigger>
          <TabsTrigger value="policies" className="shrink-0">
            {t("payroll.tabPolicies")}
          </TabsTrigger>
          <TabsTrigger value="rules" className="shrink-0">
            {t("payroll.tabRules")}
          </TabsTrigger>
          <TabsTrigger value="workflow" className="shrink-0">
            {t("payroll.tabWorkflow")}
          </TabsTrigger>
          <TabsTrigger value="reports" className="shrink-0">
            {t("payroll.tabReports")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <PayrollApprovalWorkflow
                run={summary.run}
                canAdvance={
                  canApproveFinance(persona) ||
                  persona === "hr" ||
                  persona === "admin"
                }
                onAdvanced={(run: PayrollRun) =>
                  setSummary((s) => (s ? { ...s, run } : s))
                }
              />
            </div>
            <div className="xl:col-span-2">
              <PayrollTimeline events={summary.timeline} />
            </div>
          </div>
          {viewAll && selectedPayslip ? (
            <div className="space-y-3">
              <EmployeePicker
                employees={employees}
                payslips={payslips}
                value={selectedEmployeeId}
                onChange={setSelectedEmployeeId}
              />
              <PayslipStatementView
                payslip={selectedPayslip}
                profile={selectedProfileState}
                employee={selectedEmployee}
                periodLabel={summary.period.label}
              />
              <ImpactLists payslip={selectedPayslip} />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="salary" className="mt-4 space-y-4">
          <EmployeePicker
            employees={employees}
            payslips={payslips}
            value={selectedEmployeeId}
            onChange={setSelectedEmployeeId}
          />
          {selectedProfileState ? (
            <SalaryProfilePanel
              profile={selectedProfileState}
              payslip={selectedPayslip}
            />
          ) : null}
          {selectedPayslip ? (
            <PayslipStatementView
              payslip={selectedPayslip}
              profile={selectedProfileState}
              employee={selectedEmployee}
              periodLabel={summary.period.label}
            />
          ) : null}
          {selectedPayslip ? <ImpactLists payslip={selectedPayslip} /> : null}
        </TabsContent>

        <TabsContent value="policies" className="mt-4">
          <PayrollPoliciesPanel
            policies={policies}
            editable={canEditPolicies(persona)}
            onChange={(next) => {
              setPolicies(next);
              void refreshPayrollCalculations();
            }}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <PayrollRulesEngine
            rules={rules}
            editable={canEditPolicies(persona)}
            onChange={(next) => {
              setRules(next);
              void refreshPayrollCalculations();
            }}
          />
        </TabsContent>

        <TabsContent value="workflow" className="mt-4 space-y-4">
          <PayrollApprovalWorkflow
            run={summary.run}
            canAdvance={
              canApproveFinance(persona) ||
              persona === "hr" ||
              persona === "admin"
            }
            onAdvanced={(run) => setSummary((s) => (s ? { ...s, run } : s))}
          />
          <PayrollTimeline events={summary.timeline} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <PayrollReportsPanel reports={reports} />
        </TabsContent>
      </Tabs>
      <p className="sr-only">
        {locale} {formatEgp(summary.netPayroll, locale === "ar" ? "ar" : "en")}
      </p>
    </div>
  );
}

function EmployeePayslipHero({
  payslip,
  periodLabel,
}: {
  payslip: EmployeePayslip;
  periodLabel: string;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const cards = [
    { label: t("payroll.currentPeriod"), value: periodLabel, mono: false },
    { label: t("payroll.netSalary"), value: formatEgp(payslip.net, loc), mono: true },
    { label: t("payroll.gross"), value: formatEgp(payslip.gross, loc), mono: true },
    { label: t("payroll.deductions"), value: formatEgp(payslip.deductionsTotal, loc), mono: true },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <li key={card.label}>
          <StatChip
            label={card.label}
            value={card.value}
            className={
              card.mono
                ? "[&_.stat-value]:font-mono [&_.stat-value]:text-[1.05rem] sm:[&_.stat-value]:text-[1.15rem]"
                : "[&_.stat-value]:text-[0.95rem] sm:[&_.stat-value]:text-base"
            }
          />
        </li>
      ))}
    </ul>
  );
}

function EmployeePicker({
  employees,
  payslips,
  value,
  onChange,
}: {
  employees: Employee[];
  payslips: EmployeePayslip[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t, locale } = useTranslation();
  return (
    <label className="flex flex-col gap-1.5 text-sm sm:max-w-sm">
      <span className="font-medium">{t("payroll.selectEmployee")}</span>
      <select
        className="h-9 rounded-lg border border-border/85 bg-card px-3 text-sm shadow-[0_1px_2px_rgba(11,20,36,0.035)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {payslips.map((p) => {
          const emp = employees.find((e) => e.id === p.employeeId);
          return (
            <option key={p.employeeId} value={p.employeeId}>
              {emp?.name ?? p.employeeId} ·{" "}
              {formatEgp(p.net, locale === "ar" ? "ar" : "en")}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function ImpactLists({ payslip }: { payslip: EmployeePayslip }) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";

  function impactLabel(line: (typeof payslip.attendanceImpacts)[number]) {
    const kindKey = `payroll.impactKind.${line.kind}` as TranslationPath;
    const kindLabel = t(kindKey);
    if (
      line.label.startsWith("late_tier_") ||
      line.label === "late_minutes" ||
      line.label === "missing_check_in" ||
      line.label === "missing_check_out" ||
      line.label === "absence" ||
      line.label === "half_day" ||
      line.label === "early_leave" ||
      !line.label
    ) {
      if (kindLabel && kindLabel !== kindKey) return kindLabel;
    }
    if (kindLabel && kindLabel !== kindKey) {
      return `${kindLabel} · ${line.label}`;
    }
    return line.label || line.kind;
  }

  function impactFormula(line: (typeof payslip.attendanceImpacts)[number]) {
    const parts: string[] = [line.date];
    if (line.minutes) {
      parts.push(formatHmDuration(line.minutes, t));
    }
    if (line.dayFraction > 0) {
      parts.push(
        t("payroll.impactFormulaDay", {
          pct: Math.round(line.dayFraction * 100),
          rate: formatEgp(payslip.dailyRate, loc),
        })
      );
    }
    return parts.join(" · ");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.attendanceImpact")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("payroll.attendanceImpactDesc")}
          </p>
        </div>
        <ul className="max-h-72 divide-y divide-border/60 overflow-auto">
          {payslip.attendanceImpacts?.length ? (
            payslip.attendanceImpacts.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{impactLabel(line)}</p>
                  <p className="text-xs text-muted-foreground">
                    {impactFormula(line)}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-rose-700 dark:text-rose-300">
                  −{formatEgp(line.amount, loc)}
                </span>
              </li>
            ))
          ) : (
            <li className="px-5 py-4 text-sm text-muted-foreground">
              {t("common.noResults")}
            </li>
          )}
        </ul>
      </section>
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.leaveImpact")}
          </h3>
        </div>
        <ul className="max-h-72 divide-y divide-border/60 overflow-auto">
          {payslip.leaveImpacts?.length ? (
            payslip.leaveImpacts.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{line.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.startDate} → {line.endDate} · {line.behavior}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-rose-700 dark:text-rose-300">
                  −{formatEgp(line.amount, loc)}
                </span>
              </li>
            ))
          ) : (
            <li className="px-5 py-4 text-sm text-muted-foreground">
              {t("common.noResults")}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
