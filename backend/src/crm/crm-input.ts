/** Request-body parsing/validation helpers for the CRM module. */
import { BadRequestException } from "@nestjs/common";
import {
  CrmActivityType,
  CrmLeadSource,
  CrmLeadStatus,
  CrmNextAction,
  CrmStageCategory,
} from "@prisma/client";
import { parseDate } from "../common/mappers";

export const LEAD_SOURCES = new Set<string>(Object.values(CrmLeadSource));
export const LEAD_STATUSES = new Set<string>(Object.values(CrmLeadStatus));
export const NEXT_ACTIONS = new Set<string>(Object.values(CrmNextAction));
export const STAGE_CATEGORIES = new Set<string>(
  Object.values(CrmStageCategory)
);
export const ACTIVITY_TYPES = new Set<string>(Object.values(CrmActivityType));

export function asEnum<T extends string>(
  value: unknown,
  allowed: Set<string>,
  label: string,
  fallback?: T
): T {
  if (typeof value === "string" && allowed.has(value)) return value as T;
  if (fallback !== undefined) return fallback;
  throw new BadRequestException(`Invalid ${label}`);
}

export function asOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new BadRequestException("Invalid date value");
  }
  return parseDate(value);
}

export function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new BadRequestException("tags must be an array");
  }
  return value.map((v) => String(v).trim()).filter(Boolean);
}
