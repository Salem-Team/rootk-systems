/** CRM phone identity helpers — wrap the shared canonicalizer. */
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  canonicalPhoneOrNull,
  normalizeEgyptianMobile,
} from "../lib/phone-normalize";

type PhoneDb = {
  crmLead: Pick<PrismaClient["crmLead"], "findFirst">;
};

export type DuplicateLeadSummary = {
  id: string;
  name: string;
  phone: string;
  phoneNormalized: string | null;
  ownerEmployeeId: string | null;
  stageId: string;
};

export class PhoneDuplicateException extends ConflictException {
  constructor(existing: DuplicateLeadSummary) {
    super({
      message: "A lead with this phone number already exists",
      code: "PHONE_DUPLICATE",
      error: "Conflict",
      details: { existingLead: existing },
    });
  }
}

export function summarizeLead(row: {
  id: string;
  name: string;
  phone: string;
  phoneNormalized: string | null;
  ownerEmployeeId: string | null;
  stageId: string;
}): DuplicateLeadSummary {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    phoneNormalized: row.phoneNormalized,
    ownerEmployeeId: row.ownerEmployeeId,
    stageId: row.stageId,
  };
}

/**
 * Incoming `phone` is stored as entered (trimmed). Canonical E.164 is separate.
 * Create: invalid Egyptian mobile is rejected.
 * Update of an unchanged historical invalid value: kept, phoneNormalized stays null.
 */
export function resolveStoredPhone(input: {
  raw: unknown;
  required: boolean;
  previousPhone?: string;
}): { phone: string; phoneNormalized: string | null } {
  const trimmed = String(input.raw ?? "").trim();
  if (!trimmed) {
    if (input.required) {
      throw new BadRequestException("phone is required");
    }
    throw new BadRequestException("phone is required");
  }

  const parsed = normalizeEgyptianMobile(trimmed);
  if (parsed.ok) {
    return { phone: trimmed, phoneNormalized: parsed.e164 };
  }

  const unchangedInvalid =
    input.previousPhone !== undefined &&
    input.previousPhone.trim() === trimmed;

  if (unchangedInvalid) {
    return { phone: trimmed, phoneNormalized: null };
  }

  if (parsed.code === "empty") {
    throw new BadRequestException("phone is required");
  }
  throw new BadRequestException({
    message: parsed.reason,
    code: "INVALID_PHONE",
  });
}

export async function findLeadByCanonicalPhone(
  prisma: PhoneDb,
  companyId: string,
  phoneNormalized: string,
  excludeLeadId?: string
) {
  return prisma.crmLead.findFirst({
    where: {
      companyId,
      deletedAt: null,
      phoneNormalized,
      ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      phoneNormalized: true,
      ownerEmployeeId: true,
      stageId: true,
    },
  });
}

export async function assertPhoneAvailable(
  prisma: PhoneDb,
  companyId: string,
  phoneNormalized: string | null,
  opts: { excludeLeadId?: string; actorEmployeeId?: string; canViewOthers: boolean }
) {
  if (!phoneNormalized) return;
  const existing = await findLeadByCanonicalPhone(
    prisma,
    companyId,
    phoneNormalized,
    opts.excludeLeadId
  );
  if (!existing) return;
  const visible =
    opts.canViewOthers ||
    (!!opts.actorEmployeeId && existing.ownerEmployeeId === opts.actorEmployeeId);
  if (!visible) {
    throw new ConflictException({
      message: "A lead with this phone number already exists",
      code: "PHONE_DUPLICATE",
      error: "Conflict",
      details: { existingLead: null, ownedByOther: true },
    });
  }
  throw new PhoneDuplicateException(summarizeLead(existing));
}

export function searchCanonicalFromQuery(q: string): string | null {
  return canonicalPhoneOrNull(q);
}
