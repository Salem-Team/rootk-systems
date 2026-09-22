import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { CrmLeadStatus, CrmNextAction, NotificationAudience } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  FOLLOW_UP_ADVANCE_MS,
  FOLLOW_UP_DUE_GRACE_MS,
  FOLLOW_UP_REMINDER_ACTIONS,
  dueReminderSlots,
  hasFollowUpReminderSlot,
  markFollowUpReminderSlot,
  type FollowUpReminderSlot,
} from "./crm-follow-up-meta";

const TICK_MS = 60_000;

const COPY: Record<
  FollowUpReminderSlot,
  { titleKey: string; bodyKey: string; priority: "high" | "urgent" }
> = {
  advance: {
    titleKey: "notifications.crmFollowUpAdvanceTitle",
    bodyKey: "notifications.crmFollowUpAdvanceBody",
    priority: "high",
  },
  due: {
    titleKey: "notifications.crmFollowUpDueTitle",
    bodyKey: "notifications.crmFollowUpDueBody",
    priority: "urgent",
  },
};

/**
 * One-shot reminders for call and meeting follow-ups:
 * 15 minutes before, then again at the scheduled time.
 */
@Injectable()
export class CrmFollowUpRemindersService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CrmFollowUpRemindersService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  onModuleInit() {
    void this.processDueReminders();
    this.timer = setInterval(() => {
      void this.processDueReminders();
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async processDueReminders() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - FOLLOW_UP_DUE_GRACE_MS);
      const windowEnd = new Date(now.getTime() + FOLLOW_UP_ADVANCE_MS);

      const leads = await this.prisma.crmLead.findMany({
        where: {
          deletedAt: null,
          recordType: "lead",
          status: CrmLeadStatus.active,
          nextAction: { in: [...FOLLOW_UP_REMINDER_ACTIONS] as CrmNextAction[] },
          nextFollowUpAt: { gte: windowStart, lte: windowEnd },
        },
        select: {
          id: true,
          companyId: true,
          name: true,
          nextAction: true,
          nextFollowUpAt: true,
          ownerEmployeeId: true,
          metadata: true,
        },
        take: 200,
      });

      for (const lead of leads) {
        if (!lead.nextFollowUpAt) continue;
        const slots = dueReminderSlots(lead.nextFollowUpAt, now).filter(
          (slot) => !hasFollowUpReminderSlot(lead.metadata, lead.nextFollowUpAt!, slot)
        );
        if (slots.length === 0) continue;

        const recipientIds = await this.resolveOwnerUserIds(
          lead.companyId,
          lead.ownerEmployeeId
        );

        let metadata: unknown = lead.metadata;
        for (const slot of slots) {
          if (recipientIds.length > 0) {
            const copy = COPY[slot];
            await this.notifications.notifyDomain({
              companyId: lead.companyId,
              actorId: "system",
              category: "schedule",
              priority: copy.priority,
              audience: NotificationAudience.employee,
              titleKey: copy.titleKey,
              bodyKey: copy.bodyKey,
              vars: {
                name: lead.name,
                action: lead.nextAction,
                at: lead.nextFollowUpAt.toISOString(),
              },
              href: `/crm?lead=${lead.id}`,
              entityType: "crm_lead",
              entityId: lead.id,
              recipientIds,
            });
          }
          metadata = markFollowUpReminderSlot(
            metadata,
            lead.nextFollowUpAt,
            slot
          );
          await this.prisma.crmLead.update({
            where: { id: lead.id },
            data: { metadata: metadata as ReturnType<typeof markFollowUpReminderSlot> },
          });
          this.logger.debug(
            `CRM follow-up ${slot} reminder for lead ${lead.id} at ${lead.nextFollowUpAt.toISOString()}`
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `CRM follow-up reminder tick failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      this.running = false;
    }
  }

  private async resolveOwnerUserIds(
    companyId: string,
    ownerEmployeeId: string | null
  ): Promise<string[]> {
    if (!ownerEmployeeId) return [];
    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        employeeId: ownerEmployeeId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
}
