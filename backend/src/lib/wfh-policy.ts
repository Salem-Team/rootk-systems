const DAY_FROM_INDEX = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type DayOfWeek = (typeof DAY_FROM_INDEX)[number];

export interface WfhPolicyExtras {
  enabled: boolean;
  allowedDepartments: string[];
  requiresApproval: boolean;
  monthlyQuota: number;
  hybridOfficeDays: number;
}

export function dayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  return DAY_FROM_INDEX[d.getUTCDay()] ?? "sunday";
}

export function resolveWfhPolicy(metadata: unknown): WfhPolicyExtras {
  const meta =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)
      : {};
  const extras =
    meta.wfhPolicy && typeof meta.wfhPolicy === "object"
      ? (meta.wfhPolicy as Partial<WfhPolicyExtras>)
      : {};
  return {
    enabled: extras.enabled ?? true,
    allowedDepartments: extras.allowedDepartments ?? [],
    requiresApproval: extras.requiresApproval ?? false,
    monthlyQuota: extras.monthlyQuota ?? 0,
    hybridOfficeDays: extras.hybridOfficeDays ?? 0,
  };
}

export function isEmployeeWfhAllowed(opts: {
  metadata: unknown;
  wfhDays: string[];
  department: string;
  dateKey: string;
}): boolean {
  const policy = resolveWfhPolicy(opts.metadata);
  if (!policy.enabled) return false;
  if (
    policy.allowedDepartments.length > 0 &&
    !policy.allowedDepartments.includes(opts.department)
  ) {
    return false;
  }
  const day = dayOfWeekFromDateKey(opts.dateKey);
  return opts.wfhDays.includes(day);
}
