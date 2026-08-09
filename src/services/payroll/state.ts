import { DEFAULT_COMPANY_ID } from "@/constants/company";
import { isApiMode } from "@/lib/env";
import {
  payrollPoliciesSeed,
  payrollRulesSeed,
  payrollRunSeed,
  salaryProfilesSeed,
} from "@/mocks/payroll";
import { settingsRepository } from "@/repositories";
import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import type {
  EmployeeSalaryProfile,
  PayrollPolicies,
  PayrollRule,
  PayrollRunStatus,
} from "@/types/payroll";

function hydratePolicies(): PayrollPolicies {
  const now = new Date().toISOString();
  return {
    ...payrollPoliciesSeed,
    companyId: DEFAULT_COMPANY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}

function hydrateRules(): PayrollRule[] {
  const now = new Date().toISOString();
  return payrollRulesSeed.map((r) => ({
    ...r,
    companyId: DEFAULT_COMPANY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  }));
}

function seedProfiles(): EmployeeSalaryProfile[] {
  const now = new Date().toISOString();
  return salaryProfilesSeed.map((p) => ({
    ...p,
    companyId: DEFAULT_COMPANY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  }));
}

function defaultSalaryProfile(
  employeeId: string,
  joiningDate: string
): EmployeeSalaryProfile {
  const now = new Date().toISOString();
  const basic = 15000;
  const digits = employeeId.replace(/\D/g, "") || "000";
  return {
    id: `sal-${employeeId}`,
    employeeId,
    basicSalary: basic,
    allowances: {
      housing: Math.round(basic * 0.25),
      transportation: 1200,
      meal: 800,
      phone: 400,
      other: 300,
      shift: 0,
    },
    bonuses: 0,
    commission: 0,
    incentives: 0,
    manualAdjustments: 0,
    deductions: {
      insurance: Math.round(basic * 0.11),
      tax: Math.round(basic * 0.08),
      loan: 0,
      advances: 0,
      recurring: 150,
      penalties: 0,
    },
    salaryGrade: "G5",
    salaryType: "monthly",
    payrollGroup: "standard",
    currency: "EGP",
    bankAccount: `1002${digits.padStart(8, "0")}`,
    iban: `EG380002${digits.padStart(18, "0")}`,
    paymentMethod: "bank_transfer",
    insuranceStatus: "insured",
    taxStatus: "resident",
    contractType: "full_time",
    joiningDate,
    effectiveFrom: joiningDate,
    history: [
      {
        id: `hist-${employeeId}-1`,
        effectiveFrom: joiningDate,
        basicSalary: basic,
        note: "Initial salary",
      },
    ],
    incrementHistory: [],
    companyId: DEFAULT_COMPANY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}

let policiesState = hydratePolicies();
let rulesState = hydrateRules();
let runStatus: PayrollRunStatus = payrollRunSeed.status;
let profilesState: EmployeeSalaryProfile[] = [];
let payrollHydrated = false;

type PayrollPersistedState = {
  policies: PayrollPolicies;
  rules: PayrollRule[];
  runStatus: PayrollRunStatus;
  profiles?: EmployeeSalaryProfile[];
};

export function getPoliciesState(): PayrollPolicies {
  return policiesState;
}

export function setPoliciesState(next: PayrollPolicies): void {
  policiesState = next;
}

export function getRulesState(): PayrollRule[] {
  return rulesState;
}

export function setRulesState(next: PayrollRule[]): void {
  rulesState = next;
}

export function getRunStatus(): PayrollRunStatus {
  return runStatus;
}

export function setRunStatus(next: PayrollRunStatus): void {
  runStatus = next;
}

function hydrateProfiles(): EmployeeSalaryProfile[] {
  if (profilesState.length === 0) {
    profilesState = seedProfiles();
  }
  return profilesState;
}

export function getProfilesState(): EmployeeSalaryProfile[] {
  return hydrateProfiles();
}

export function setProfilesState(next: EmployeeSalaryProfile[]): void {
  profilesState = next;
}

/** Ensure a new hire has a payslip profile in local mode. */
export async function ensureSalaryProfileForEmployee(input: {
  employeeId: string;
  joiningDate: string;
}): Promise<void> {
  if (isApiMode()) return;
  await ensurePayrollStateLoaded();
  const profiles = hydrateProfiles();
  if (profiles.some((p) => p.employeeId === input.employeeId)) return;
  profilesState = [
    ...profiles,
    defaultSalaryProfile(input.employeeId, input.joiningDate),
  ];
  await persistPayrollState();
}

export async function ensurePayrollStateLoaded(): Promise<void> {
  if (payrollHydrated || isApiMode()) return;
  payrollHydrated = true;
  try {
    const storage = getStorageAdapter();
    const saved = await storage.getItem<PayrollPersistedState>(
      StorageKeys.payrollState
    );
    if (!saved) {
      profilesState = seedProfiles();
      return;
    }
    if (saved.policies) policiesState = { ...policiesState, ...saved.policies };
    if (Array.isArray(saved.rules) && saved.rules.length > 0) {
      rulesState = saved.rules;
    }
    if (saved.runStatus) runStatus = saved.runStatus;
    if (Array.isArray(saved.profiles) && saved.profiles.length > 0) {
      profilesState = saved.profiles;
    } else {
      profilesState = seedProfiles();
    }
  } catch {
    profilesState = seedProfiles();
  }
}

export async function persistPayrollState(): Promise<void> {
  if (isApiMode()) return;
  try {
    await getStorageAdapter().setItem(StorageKeys.payrollState, {
      policies: policiesState,
      rules: rulesState,
      runStatus,
      profiles: hydrateProfiles(),
    } satisfies PayrollPersistedState);
  } catch {
    /* best-effort */
  }
}

/** Reset in-memory payroll cache after demo wipe. */
export function resetPayrollMemory(): void {
  policiesState = hydratePolicies();
  rulesState = hydrateRules();
  runStatus = payrollRunSeed.status;
  profilesState = [];
  payrollHydrated = false;
}

export async function syncCurrencyFromSettings(): Promise<void> {
  try {
    const settings = await settingsRepository.get();
    if (settings.currency && policiesState.currency !== settings.currency) {
      policiesState = {
        ...policiesState,
        currency: settings.currency,
        updatedAt: new Date().toISOString(),
        version: policiesState.version + 1,
      };
    }
  } catch {
    /* settings may be missing during first boot */
  }
}

export { hydratePolicies };
