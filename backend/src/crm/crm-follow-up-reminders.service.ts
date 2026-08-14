import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { CrmLeadStatus, NotificationAudience } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  FOLLOW_UP_REMINDER_LEAD_MINUTES,
  hasFollowUpReminderFor,
  markFollowUpReminderSent,
} from "./crm-follow-up-meta";

const TICK_MS = 60_000;

/**
 * Polls for CRM leads whose next follow-up is within the next 15 minutes
 * and sends a one-shot in-app reminder to the lead owner.
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
      const windowEnd = new Date(
        now.getTime() + FOLLOW_UP_REMINDER_LEAD_MINUTES * 60_000
      );

      const leads = await this.prisma.crmLead.findMany({
        where: {
          deletedAt: null,
          status: CrmLeadStatus.active,
          nextFollowUpAt: { gt: now, lte: windowEnd },
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
        if (hasFollowUpReminderFor(lead.metadata, lead.nextFollowUpAt)) continue;

        const recipientIds = await this.resolveOwnerUserIds(
          lead.companyId,
          lead.ownerEmployeeId
        );
        if (recipientIds.length === 0) {
          // Still mark so we do not retry forever when the owner has no login.
          await this.markSent(lead.id, lead.metadata, lead.nextFollowUpAt);
          continue;
        }

        const followAtIso = lead.nextFollowUpAt.toISOString();
        await this.notifications.notifyDomain({
          companyId: lead.companyId,
          actorId: "system",
          category: "schedule",
          priority: "high",
          audience: NotificationAudience.employee,
          titleKey: "notifications.crmFollowUpSoonTitle",
          bodyKey: "notifications.crmFollowUpSoonBody",
          vars: {
            name: lead.name,
            action: lead.nextAction,
          },
          href: "/crm",
          entityType: "crm_lead",
          entityId: lead.id,
          recipientIds,
        });

        await this.markSent(lead.id, lead.metadata, lead.nextFollowUpAt);
        this.logger.debug(
          `CRM follow-up reminder sent for lead ${lead.id} at ${followAtIso}`
        );
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

  private async markSent(
    leadId: string,
    metadata: unknown,
    followUpAt: Date
  ) {
    await this.prisma.crmLead.update({
      where: { id: leadId },
      data: {
        metadata: markFollowUpReminderSent(metadata, followUpAt),
      },
    });
  }
}
