/** CRM contact identity helpers — wrap the shared canonicalizer. */
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  ContactIdentityError,
  resolveCrmContact,
  type CrmContactKind,
} from "../lib/contact-identity";
import {
  MAX_LEAD_CONTACTS,
  type LeadContactRecord,
} from "../lib/lead-contacts";
import { canonicalPhoneOrNull } from "../lib/phone-normalize";

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
 * Incoming contact is a phone or a platform username.
 * Phone: stored as entered; uniqueness key is E.164.
 * Handle: stored as `@handle`; uniqueness key is `h:{kind}:{handle}`.
 * Update of an unchanged historical invalid phone: kept, phoneNormalized stays null.
 */
export function resolveStoredPhone(input: {
  raw: unknown;
  kind?: unknown;
  required: boolean;
  previousPhone?: string;
  previousNormalized?: string | null;
}): {
  kind: CrmContactKind;
  phone: string;
  phoneNormalized: string | null;
} {
  try {
    return resolveCrmContact({
      raw: input.raw,
      kind: input.kind,
      previousPhone: input.previousPhone,
      previousNormalized: input.previousNormalized,
    });
  } catch (error) {
    if (error instanceof ContactIdentityError) {
      if (error.code === "empty") {
        throw new BadRequestException("phone is required");
      }
      if (error.code === "invalid_handle") {
        throw new BadRequestException({
          message: error.message,
          code: "INVALID_CONTACT",
        });
      }
      throw new BadRequestException({
        message: error.message,
        code: "INVALID_PHONE",
      });
    }
    throw error;
  }
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
      ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
      OR: [
        { phoneNormalized },
        {
          metadata: {
            path: ["contactKeys"],
            array_contains: phoneNormalized,
          },
        },
      ],
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
  opts: {
    excludeLeadId?: string;
    actorEmployeeId?: string;
    canViewOthers?: boolean;
    visibleOwnerIds?: string[] | null;
  }
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
    opts.visibleOwnerIds !== undefined
      ? opts.visibleOwnerIds === null ||
        (!!existing.ownerEmployeeId &&
          opts.visibleOwnerIds.includes(existing.ownerEmployeeId))
      : Boolean(opts.canViewOthers) ||
        (!!opts.actorEmployeeId &&
          existing.ownerEmployeeId === opts.actorEmployeeId);
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

export async function assertContactsAvailable(
  prisma: PhoneDb,
  companyId: string,
  keys: string[],
  opts: {
    excludeLeadId?: string;
    actorEmployeeId?: string;
    canViewOthers?: boolean;
    visibleOwnerIds?: string[] | null;
  }
) {
  for (const key of keys) {
    await assertPhoneAvailable(prisma, companyId, key, opts);
  }
}

export function resolveIncomingContactList(
  body: Record<string, unknown>,
  previous?: {
    phone: string;
    phoneNormalized: string | null;
    extras?: LeadContactRecord[];
  }
): {
  primary: LeadContactRecord;
  extras: LeadContactRecord[];
  replaceExtras: boolean;
} {
  const rawList = Array.isArray(body.contacts) ? body.contacts : null;
  if (rawList) {
    if (rawList.length > MAX_LEAD_CONTACTS) {
      throw new BadRequestException("Too many contacts");
    }
    const resolved: LeadContactRecord[] = [];
    const seen = new Set<string>();
    for (const [index, item] of rawList.entries()) {
      const row =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      const raw = row.phone ?? row.value;
      if (!String(raw ?? "").trim()) continue;
      const next = resolveStoredPhone({
        raw,
        kind: row.kind,
        required: true,
        previousPhone: index === 0 ? previous?.phone : undefined,
        previousNormalized: index === 0 ? previous?.phoneNormalized : undefined,
      });
      if (next.phoneNormalized) {
        if (seen.has(next.phoneNormalized)) {
          throw new BadRequestException({
            message: "Duplicate contact on the same lead",
            code: "INVALID_CONTACT",
          });
        }
        seen.add(next.phoneNormalized);
      }
      resolved.push(next);
    }
    if (resolved.length === 0) {
      throw new BadRequestException("phone is required");
    }
    return {
      primary: resolved[0],
      extras: resolved.slice(1),
      replaceExtras: true,
    };
  }

  const primary = resolveStoredPhone({
    raw: body.phone !== undefined ? body.phone : previous?.phone,
    kind: body.contactKind,
    required: true,
    previousPhone: previous?.phone,
    previousNormalized: previous?.phoneNormalized,
  });
  return {
    primary,
    extras: previous?.extras ?? [],
    replaceExtras: false,
  };
}

export function searchCanonicalFromQuery(q: string): string | null {
  return canonicalPhoneOrNull(q);
}
