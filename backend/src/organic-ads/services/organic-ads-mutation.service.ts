import { Injectable, NotFoundException } from "@nestjs/common";
import { AdStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { assertCap, mapAd, type Actor } from "../organic-ads.helpers";
import { OrganicAdsHistoryService } from "./organic-ads-history.service";
import { OrganicAdsTaskLinkService } from "./organic-ads-task-link.service";

/** Advertisement edits, status transitions, and soft-delete. */
@Injectable()
export class OrganicAdsMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: OrganicAdsHistoryService,
    private readonly taskLink: OrganicAdsTaskLinkService
  ) {}

  async update(
    companyId: string,
    actor: Actor,
    id: string,
    body: {
      project?: string;
      campaign?: string;
      notes?: string;
      status?: string;
    }
  ) {
    const current = await this.prisma.organicAdvertisement.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Advertisement not found");

    const isOwner = current.ownerEmployeeId === actor.employeeId;
    if (isOwner) assertCap(actor, "edit_own");
    else assertCap(actor, "edit_team");

    const nextStatus = body.status
      ? (body.status as AdStatus)
      : current.status;

    const row = await this.prisma.organicAdvertisement.update({
      where: { id },
      data: {
        project: body.project ?? current.project,
        campaign: body.campaign ?? current.campaign,
        notes: body.notes ?? current.notes,
        status: nextStatus,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    // Sync target progress when activating/deactivating a linked ad.
    if (
      current.workTaskId &&
      nextStatus !== current.status
    ) {
      if (
        nextStatus === AdStatus.active &&
        current.status !== AdStatus.active
      ) {
        await this.taskLink.completeLinkedTask(
          companyId,
          actor,
          current.workTaskId,
          row.url,
          row.platform
        );
      }
      if (
        (nextStatus === AdStatus.inactive ||
          nextStatus === AdStatus.duplicate) &&
        current.status === AdStatus.active
      ) {
        await this.taskLink.reopenLinkedTask(companyId, actor, current.workTaskId);
      }
    }

    const name = await this.history.actorName(companyId, actor);
    await this.history.writeHistory(companyId, {
      advertisementId: id,
      action:
        body.status && body.status !== current.status
          ? "status_changed"
          : "updated",
      actorId: actor.userId,
      actorName: name,
      note:
        body.status && body.status !== current.status
          ? `Changed status to ${body.status}`
          : "Updated advertisement",
      previousValue: current.status,
      newValue: row.status,
    });

    return mapAd(row);
  }

  async remove(companyId: string, actor: Actor, id: string) {
    const current = await this.prisma.organicAdvertisement.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Advertisement not found");

    const isOwner = current.ownerEmployeeId === actor.employeeId;
    if (isOwner) assertCap(actor, "delete_own");
    else assertCap(actor, "delete_team");

    if (current.workTaskId && current.status === AdStatus.active) {
      await this.taskLink.reopenLinkedTask(companyId, actor, current.workTaskId);
    }

    await this.prisma.organicAdvertisement.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        workTaskId: null,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    const name = await this.history.actorName(companyId, actor);
    await this.history.writeHistory(companyId, {
      advertisementId: id,
      action: "deleted",
      actorId: actor.userId,
      actorName: name,
      note: "Deleted advertisement",
      previousValue: current.status,
      newValue: "deleted",
    });

    return true;
  }
}
