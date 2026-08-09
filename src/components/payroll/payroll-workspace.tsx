"use client";

import { useEffect, useMemo, useState } from "react";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PayrollAdminView } from "@/components/payroll/payroll-admin-view";
import { PayrollEmployeeView } from "@/components/payroll/payroll-employee-view";
import {
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
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayrollDashboardSummary,
  PayrollPersona,
  PayrollPolicies,
  PayrollReportBundle,
  PayrollRule,
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
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedProfileState, setSelectedProfileState] =
    useState<EmployeeSalaryProfile | null>(null);

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
          }
          if (emp.success) {
            setEmployees(emp.data);
            setSelectedEmployeeId((prev) => {
              if (prev && emp.data.some((e) => e.id === prev)) return prev;
              return "";
            });
          }
          if (rep.success) setReports(rep.data);
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
        name: sessionUser.displayName || sessionUser.firstName || sessionUser.email,
        employeeId: workEmployeeId,
        department: "Operations" as Employee["department"],
        email: sessionUser.email,
      } satisfies Pick<Employee, "name" | "employeeId" | "department" | "email">),
    [employees, workEmployeeId, sessionUser]
  );

  useEffect(() => {
    if (!selectedEmployeeId || role === "employee") {
      setSelectedProfileState(null);
      return;
    }
    let mounted = true;
    void getSalaryProfile(selectedEmployeeId).then((res) => {
      if (!mounted) return;
      if (res.success) setSelectedProfileState(res.data);
      else setSelectedProfileState(null);
    });
    return () => {
      mounted = false;
    };
  }, [selectedEmployeeId, role]);

  if (loading) return <PageSkeleton />;

  if (role === "employee") {
    if (!summary) {
      return (
        <EmptyState
          title={t("common.error")}
          description={t("payroll.loadFailed")}
        />
      );
    }

    return (
      <PayrollEmployeeView
        summary={summary}
        myProfile={myProfile}
        myPayslip={myPayslip}
        myHistory={myHistory}
        myEmployee={myEmployee}
      />
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

  return (
    <PayrollAdminView
      persona={persona}
      onPersonaChange={setPersona}
      summary={summary}
      onSummaryChange={setSummary}
      policies={policies}
      onPoliciesChange={setPolicies}
      rules={rules}
      onRulesChange={setRules}
      reports={reports}
      employees={employees}
      payslips={payslips}
      onPayslipsChange={setPayslips}
      selectedEmployeeId={selectedEmployeeId}
      onSelectedEmployeeIdChange={setSelectedEmployeeId}
      selectedPayslip={selectedPayslip}
      selectedEmployee={selectedEmployee}
      selectedProfileState={selectedProfileState}
      onSelectedProfileStateChange={setSelectedProfileState}
      tab={tab}
      onTabChange={setTab}
      editProfileOpen={editProfileOpen}
      onEditProfileOpenChange={setEditProfileOpen}
      onRefreshPayrollCalculations={refreshPayrollCalculations}
      locale={locale}
    />
  );
}
