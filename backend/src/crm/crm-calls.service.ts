import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  CrmActivityType,
  CrmCall,
  CrmCallDirection,
  CrmCallSource,
  CrmCallStatus,
  CrmNextAction,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { writeActivity } from "../common/activity-writer";
import { canonicalPhoneOrNull } from "../lib/phone-normalize";
import { type Actor } from "./crm-access";
import {
  asEnum,
  asOptionalDate,
  NEXT_ACTIONS,
} from "./crm-input";
import { clearFollowUpReminderMeta } from "./crm-follow-up-meta";
import { CrmSharedService } from "./crm-shared.service";

const CALL_DIRECTIONS = new Set<string>(Object.values(CrmCallDirection));
const CALL_STATUSES = new Set<string>(Object.values(CrmCallStatus));
const CALL_SOURCES = new Set<string>(Object.values(CrmCallSource));

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function formatCallClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(rest)}`;
  return `${minutes}:${pad(rest)}`;
}

@Injectable()
export class CrmCallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService
  ) {}

  async recordCall(
    companyId: string,
    actor: Actor,
    leadId: string,
    body: Record<string, unknown>
  ) {
    const lead = await this.shared.requireLead(companyId, actor, leadId);
    this.shared.assertCanEditLead(actor, lead);

    const status = asEnum<CrmCallStatus>(
      body.status,
      CALL_STATUSES,
      "status"
    );
    const direction = asEnum<CrmCallDirection>(
      body.direction,
      CALL_DIRECTIONS,
      "direction",
      CrmCallDirection.outgoing
    );
    const source = asEnum<CrmCallSource>(
      body.source,
      CALL_SOURCES,
      "source",
      CrmCallSource.web
    );

    const externalCallId =
      typeof body.externalCallId === "string" && body.externalCallId.trim()
        ? body.externalCallId.trim()
        : null;

    if (externalCallId) {
      const existing = await this.prisma.crmCall.findUnique({
        where: {
          companyId_externalCallId: { companyId, externalCallId },
        },
      });
      const replay = this.replayOwnedCall(existing, leadId);
      if (replay) return replay;
    }

    const phone =
      typeof body.phoneNumber === "string" && body.phoneNumber.trim()
        ? body.phoneNumber.trim()
        : lead.phone;
    const phoneNormalized =
      canonicalPhoneOrNull(phone) ?? lead.phoneNormalized ?? null;

    let durationSeconds: number | null = null;
    if (body.durationSeconds !== undefined && body.durationSeconds !== null) {
      const n = Number(body.durationSeconds);
      if (!Number.isFinite(n) || n < 0 || n > 86_400) {
        throw new BadRequestException("Invalid durationSeconds");
      }
      durationSeconds = Math.round(n);
    }

    const startedAt = asOptionalDate(body.startedAt) ?? new Date();
    const endedAt = asOptionalDate(body.endedAt) ?? new Date();
    if (durationSeconds === null && endedAt && startedAt) {
      const diff = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
      if (Number.isFinite(diff) && diff >= 0 && diff <= 86_400) {
        durationSeconds = diff;
      }
    }
    const notes = String(body.notes ?? "");
    const nextAction = asEnum<CrmNextAction>(
      body.nextAction,
      NEXT_ACTIONS,
      "nextAction",
      CrmNextAction.none
    );
    const nextFollowUpAt = asOptionalDate(body.nextFollowUpAt);

    const callAnswered = status === CrmCallStatus.answered;
    await this.shared.ensureDefaultFeedbackTypes(companyId);
    const feedbackType =
      (await this.prisma.crmFeedbackType.findFirst({
        where: {
          companyId,
          deletedAt: null,
          active: true,
          name: { equals: "Other", mode: "insensitive" },
        },
        orderBy: { sortOrder: "asc" },
      })) ??
      (await this.prisma.crmFeedbackType.findFirst({
        where: { companyId, deletedAt: null, active: true },
        orderBy: { sortOrder: "asc" },
      }));
    if (!feedbackType) {
      throw new BadRequestException("Feedback type not found");
    }

    try {
      const saved = await this.prisma.$transaction(async (tx) => {
        const call = await tx.crmCall.create({
          data: {
            companyId,
            leadId,
            employeeId: actor.employeeId || null,
            phone,
            phoneNormalized,
            direction,
            status,
            startedAt,
            endedAt,
            durationSeconds,
            source,
            externalCallId,
            notes,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        });

        const feedback = await tx.crmLeadFeedback.create({
          data: {
            companyId,
            leadId,
            feedbackTypeId: feedbackType.id,
            customerFeedback: notes,
            callAnswered,
            nextAction,
            nextFollowUpAt: nextFollowUpAt === undefined ? null : nextFollowUpAt,
            notes,
            recordedByEmployeeId: actor.employeeId || null,
            createdBy: actor.userId,
            updatedBy: actor.userId,
            metadata: { callId: call.id },
          },
        });

        const title =
          status === CrmCallStatus.answered
            ? "Call answered"
            : status === CrmCallStatus.missed
              ? "Call missed"
              : status === CrmCallStatus.rejected
                ? "Call rejected"
                : status === CrmCallStatus.failed
                  ? "Call failed"
                  : "Call logged";

        const durationLabel =
          durationSeconds === null ? "" : formatCallClock(durationSeconds);
        const description = [durationLabel, notes].filter(Boolean).join(" · ");

        const activity = await tx.crmLeadActivity.create({
          data: {
            companyId,
            leadId,
            type: CrmActivityType.call,
            title,
            description,
            actorEmployeeId: actor.employeeId || null,
            occurredAt: startedAt ?? new Date(),
            createdBy: actor.userId,
            updatedBy: actor.userId,
            metadata: {
              callId: call.id,
              direction,
              status,
              source,
              durationSeconds,
            },
          },
        });

        const leadPatch: Prisma.CrmLeadUpdateInput = {
          lastActivityAt: new Date(),
          nextAction,
          updatedBy: actor.userId,
          version: { increment: 1 },
        };
        if (nextFollowUpAt !== undefined) {
          leadPatch.nextFollowUpAt = nextFollowUpAt;
          leadPatch.metadata = clearFollowUpReminderMeta(lead.metadata);
        }

        await tx.crmLead.update({ where: { id: leadId }, data: leadPatch });
        await tx.crmCall.update({
          where: { id: call.id },
          data: { activityId: activity.id, feedbackId: feedback.id },
        });

        return tx.crmCall.findUniqueOrThrow({ where: { id: call.id } });
      });

      await this.shared.writeHistory(companyId, {
        leadId,
        action: "activity_added",
        actorId: actor.userId,
        actorName: await this.shared.actorName(actor),
        note: `Call ${status}`,
        newValue: status,
      });
      await writeActivity(this.prisma, {
        companyId,
        type: "crm_activity_added",
        title: "CRM call recorded",
        description: `${lead.name}: ${status}`,
        employeeId: lead.ownerEmployeeId ?? undefined,
        actorId: actor.userId,
      });

      return this.mapCall(saved);
    } catch (error) {
      if (externalCallId && isUniqueViolation(error)) {
        const raced = await this.prisma.crmCall.findUnique({
          where: {
            companyId_externalCallId: { companyId, externalCallId },
          },
        });
        const replay = this.replayOwnedCall(raced, leadId);
        if (replay) return replay;
      }
      throw error;
    }
  }

  /** Same client event on this lead is idempotent. Never return another lead’s call. */
  private replayOwnedCall(existing: CrmCall | null, leadId: string) {
    if (!existing || existing.deletedAt !== null) return null;
    if (existing.leadId !== leadId) {
      throw new ConflictException({
        message: "This call was already recorded",
        code: "CALL_DUPLICATE",
        error: "Conflict",
        details: { alreadySynchronized: true },
      });
    }
    return this.mapCall(existing);
  }

  private mapCall(row: {
    id: string;
    companyId: string;
    leadId: string;
    employeeId: string | null;
    phone: string;
    phoneNormalized: string | null;
    direction: CrmCallDirection;
    status: CrmCallStatus;
    startedAt: Date | null;
    endedAt: Date | null;
    durationSeconds: number | null;
    source: CrmCallSource;
    externalCallId: string | null;
    notes: string;
    activityId: string | null;
    feedbackId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      leadId: row.leadId,
      employeeId: row.employeeId,
      phoneNumber: row.phone,
      phoneNormalized: row.phoneNormalized,
      direction: row.direction,
      status: row.status,
      startedAt: row.startedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      durationSeconds: row.durationSeconds,
      source: row.source,
      externalCallId: row.externalCallId,
      notes: row.notes,
      activityId: row.activityId,
      feedbackId: row.feedbackId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
