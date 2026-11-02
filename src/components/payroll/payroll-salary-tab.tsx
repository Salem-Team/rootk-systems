"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SalaryProfilePanel } from "@/components/payroll/salary-profile-panel";
import { PayslipHistoryPanel } from "@/components/payroll/payslip-history-panel";
import { PayslipStatementView } from "@/components/payroll/payslip-statement";
import { ImpactLists } from "./payroll-workspace-shared";
import {
  getPayslipHistory,
  listSalaryProfiles,
} from "@/services/payroll.service";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  EmployeeSalaryProfile,
  PayslipHistoryItem,
  PayrollPersona,
} from "@/types/payroll";

type ProfileRow = EmployeeSalaryProfile & {
  employeeName?: string;
  department?: string;
  position?: string;
  employeeCode?: string;
  status?: string;
};

export function PayrollSalaryTab({
  persona,
  employees,
  payslips,
  selectedEmployeeId,
  onSelectedEmployeeIdChange,
  selectedProfileState,
  selectedPayslip,
  selectedEmployee,
  periodLabel,
  onEditProfile,
  profileReloadNonce = 0,
}: {
  persona: PayrollPersona;
  employees: Employee[];
  payslips: EmployeePayslip[];
  selectedEmployeeId: string;
  onSelectedEmployeeIdChange: (id: string) => void;
  selectedProfileState: EmployeeSalaryProfile | null;
  selectedPayslip: EmployeePayslip | null;
  selectedEmployee: Employee | null;
  periodLabel: string;
  onEditProfile: () => void;
  profileReloadNonce?: number;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const canEditSalary =
    persona === "admin" || persona === "hr" || persona === "finance";
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<PayslipHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    void listSalaryProfiles().then((res) => {
      if (!mounted) return;
      if (res.success) setProfiles(res.data);
      else setProfiles([]);
    });
    return () => {
      mounted = false;
    };
  }, [profileReloadNonce]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setHistory([]);
      return;
    }
    let mounted = true;
    setHistoryLoading(true);
    void getPayslipHistory(selectedEmployeeId).then((res) => {
      if (!mounted) return;
      setHistory(res.success ? res.data : []);
      setHistoryLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [selectedEmployeeId, profileReloadNonce]);

  const rows = useMemo(() => {
    const byId = new Map(profiles.map((p) => [p.employeeId, p]));
    const q = query.trim().toLowerCase();
    return employees
      .map((emp) => {
        const profile = byId.get(emp.id) ?? null;
        const slip = payslips.find((p) => p.employeeId === emp.id) ?? null;
        return { emp, profile, slip };
      })
      .filter(({ emp, profile }) => {
        if (!q) return true;
        const hay = [
          emp.name,
          emp.employeeId,
          emp.department,
          emp.position,
          profile?.basicSalary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [employees, profiles, payslips, query]);

  return (
    <div className="space-y-3">
      <section className="surface-panel overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {t("payroll.salaryDirectoryTitle")}
          </h3>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("payroll.searchEmployees")}
            className="h-10 sm:max-w-xs"
          />
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map(({ emp, profile, slip }) => {
              const selected = selectedEmployeeId === emp.id;
              const basic = profile?.basicSalary;
              return (
                <li
                  key={emp.id}
                  className={
                    selected
                      ? "bg-primary/[0.04]"
                      : undefined
                  }
                >
                  <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      className="min-w-0 text-start"
                      onClick={() => onSelectedEmployeeIdChange(emp.id)}
                    >
                      <p className="truncate text-[14px] font-semibold">
                        {emp.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[emp.employeeId, emp.department, emp.position]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {profile ? (
                        <Badge variant="outline" className="tabular-nums">
                          {t("payroll.basicSalary")}:{" "}
                          {formatEgp(basic ?? 0, loc)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t("payroll.noSalaryProfile")}
                        </Badge>
                      )}
                      {slip ? (
                        <Badge variant="outline" className="tabular-nums">
                          {t("payroll.netSalary")}: {formatEgp(slip.net, loc)}
                        </Badge>
                      ) : null}
                      {canEditSalary ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={profile ? "outline" : "default"}
                          className="gap-1.5"
                          onClick={() => {
                            onSelectedEmployeeIdChange(emp.id);
                            onEditProfile();
                          }}
                        >
                          {profile ? (
                            <Pencil className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          {profile
                            ? t("payroll.editSalaryProfile")
                            : t("payroll.createSalaryProfile")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedEmployeeId && selectedProfileState ? (
        <SalaryProfilePanel
          profile={selectedProfileState}
          payslip={selectedPayslip}
          onEdit={canEditSalary ? onEditProfile : undefined}
        />
      ) : selectedEmployeeId && !selectedProfileState ? (
        <EmptyState
          title={t("payroll.noSalaryProfile")}
          actionLabel={
            canEditSalary ? t("payroll.createSalaryProfile") : undefined
          }
          onAction={canEditSalary ? onEditProfile : undefined}
        />
      ) : null}

      {selectedPayslip ? (
        <>
          <PayslipStatementView
            payslip={selectedPayslip}
            profile={selectedProfileState}
            employee={selectedEmployee}
            periodLabel={periodLabel}
          />
          <ImpactLists payslip={selectedPayslip} />
        </>
      ) : null}

      {selectedEmployeeId ? (
        historyLoading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : (
          <PayslipHistoryPanel items={history} />
        )
      ) : null}
    </div>
  );
}
