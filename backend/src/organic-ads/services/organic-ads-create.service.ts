import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { AdPlatform, AdStatus, AdType, AdValidationStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { writeActivity } from "../../common/activity-writer";
import { AppRole } from "../../common/roles";
import { inspectAdUrl, normalizeAdUrl } from "../../lib/organic-ads-url";
import { NotificationsService } from "../../notifications/notifications.service";
import { assertCap, findDuplicate, mapAd, type Actor } from "../organic-ads.helpers";
import { OrganicAdsSettingsService } from "./organic-ads-settings.service";
import { OrganicAdsHistoryService } from "./organic-ads-history.service";
import { OrganicAdsTaskLinkService } from "./organic-ads-task-link.service";

/** Advertisement creation, including duplicate detection and task auto-linking. */
@Injectable()
export class OrganicAdsCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: OrganicAdsSettingsService,
    private readonly history: OrganicAdsHistoryService,
    private readonly taskLink: OrganicAdsTaskLinkService
  ) {}

  async create(
    companyId: string,
    actor: Actor,
    body: {
      url: string;
      project?: string;
      campaign?: string;
      notes?: string;
      forceDuplicate?: boolean;
      workTaskId?: string;
      targetId?: string;
      linkToOpenTask?: boolean;
    }
  ) {
    assertCap(actor, "create");
    const ownerEmployeeId =
      actor.role === AppRole.employee
        ? actor.employeeId
        : actor.employeeId;

    if (!ownerEmployeeId) {
      throw new BadRequestException(
        "Your account is not linked to an employee profile"
      );
    }

    const inspected = inspectAdUrl(body.url ?? "");
    if (
      inspected.validationStatus === "invalid" ||
      inspected.validationStatus === "unsupported"
    ) {
      throw new BadRequestException(inspected.validationMessage);
    }

    const existing = await this.prisma.organicAdvertisement.findMany({
      where: { companyId, deletedAt: null },
    });
    const duplicate = findDuplicate(
      existing,
      inspected.canonicalUrl,
      inspected.externalId,
      inspected.platform as AdPlatform
    );

    if (duplicate && !body.forceDuplicate) {
      throw new ConflictException({
        message: "This advertisement has already been added",
        code: "DUPLICATE_AD",
        details: { duplicate: mapAd(duplicate) },
      });
    }

    if (duplicate && body.forceDuplicate) {
      assertCap(actor, "override_duplicate");
      const settings = await this.settings.ensureSettings(companyId, actor.userId);
      if (!settings.allowDuplicateOverride) {
        throw new ForbiddenException("Duplicate override is disabled");
      }
    }

    const shouldLink = body.linkToOpenTask !== false;
    let linkTask =
      shouldLink || body.workTaskId || body.targetId
        ? await this.taskLink.findOpenLinkableTask(
            companyId,
            ownerEmployeeId,
            body.workTaskId,
            body.targetId
          )
        : null;

    // Explicit target without open task is still recorded on the ad.
    const status: AdStatus =
      inspected.validationStatus === "valid"
        ? duplicate && body.forceDuplicate
          ? AdStatus.needs_review
          : AdStatus.active
        : AdStatus.needs_review;

    const now = new Date();
    const row = await this.prisma.organicAdvertisement.create({
      data: {
        companyId,
        ownerEmployeeId,
        platform: inspected.platform as AdPlatform,
        adType: inspected.adType as AdType,
        url: body.url.trim(),
        canonicalUrl: inspected.canonicalUrl || normalizeAdUrl(body.url),
        externalId: inspected.externalId,
        project: body.project?.trim() ?? "",
        campaign: body.campaign?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
        status,
        validationStatus: inspected.validationStatus as AdValidationStatus,
        validationMessage: inspected.validationMessage,
        duplicateOfId:
          duplicate && body.forceDuplicate ? duplicate.id : null,
        addedAt: now,
        lastVerifiedAt: now,
        workTaskId: linkTask?.id ?? null,
        targetId: linkTask?.targetId ?? body.targetId ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    if (linkTask && status === AdStatus.active) {
      try {
        await this.taskLink.completeLinkedTask(
          companyId,
          actor,
          linkTask.id,
          row.url,
          row.platform
        );
      } catch (error) {
        // Keep the ad; clear broken link if completion failed.
        await this.prisma.organicAdvertisement.update({
          where: { id: row.id },
          data: {
            workTaskId: null,
            updatedBy: actor.userId,
            version: { increment: 1 },
          },
        });
        linkTask = null;
        void error;
      }
    }

    const name = await this.history.actorName(companyId, actor);
    await this.history.writeHistory(companyId, {
      advertisementId: row.id,
      action: body.forceDuplicate ? "override_duplicate" : "created",
      actorId: actor.userId,
      actorName: name,
      note: linkTask
        ? `Added a ${row.platform} advertisement and advanced linked target task`
        : `Added a ${row.platform} advertisement`,
      newValue: row.status,
    });

    await writeActivity(this.prisma, {
      companyId,
      type: "organic_ad",
      title: "Organic advertisement added",
      description: `${name} added a ${row.platform} advertisement`,
      employeeId: ownerEmployeeId,
      actorId: actor.userId,
    });

    await this.notifications.notifyDomain({
      companyId,
      actorId: actor.userId,
      category: "organic_ad",
      priority: "normal",
      audience: "admin",
      titleKey: "notifications.genericTitle",
      bodyKey: "notifications.genericBody",
      vars: {
        title: "Organic Ad added",
        body: `${name} registered a ${row.platform} advertisement`,
      },
      href: "/organic-ads",
      entityType: "organic_ad",
      entityId: row.id,
    }).catch(() => undefined);

    const fresh = await this.prisma.organicAdvertisement.findFirstOrThrow({
      where: { id: row.id },
    });
    return mapAd(fresh);
  }
}
