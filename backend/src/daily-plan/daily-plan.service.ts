import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { iso } from "../common/mappers";
import { normalizeHm, parseHmMinutes, slotsOverlap } from "../lib/daily-plan";

const MAX_SLOTS = 24;

type SlotInput = {
  id?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
};

@Injectable()
export class DailyPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async get(companyId: string, actorId = "system") {
    const plan = await this.ensurePlan(companyId, actorId);
    return this.mapPlan(plan);
  }

  async put(
    companyId: string,
    actorId: string,
    body: { title?: string; slots?: unknown }
  ) {
    const current = await this.ensurePlan(companyId, actorId);
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 80)
        : current.title;
    const slots = this.normalizeSlots(Array.isArray(body.slots) ? body.slots : []);

    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.dailyPlanSlot.deleteMany({ where: { planId: current.id } });
      const row = await tx.dailyPlan.update({
        where: { id: current.id },
        data: {
          title,
          updatedBy: actorId,
          version: { increment: 1 },
          slots: {
            create: slots.map((slot, index) => ({
              companyId,
              title: slot.title,
              description: slot.description,
              startTime: slot.startTime,
              endTime: slot.endTime,
              sortOrder: index,
              createdBy: actorId,
              updatedBy: actorId,
            })),
          },
        },
        include: { slots: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] } },
      });
      return row;
    });

    return this.mapPlan(saved);
  }

  private async ensurePlan(companyId: string, actorId: string) {
    const existing = await this.prisma.dailyPlan.findUnique({
      where: { companyId },
      include: {
        slots: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
        },
      },
    });
    if (existing && !existing.deletedAt) return existing;
    return this.prisma.dailyPlan.create({
      data: {
        companyId,
        title: "Daily Plan",
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: { slots: true },
    });
  }

  private normalizeSlots(raw: unknown[]) {
    if (raw.length > MAX_SLOTS) {
      throw new BadRequestException(`A daily plan can have at most ${MAX_SLOTS} blocks`);
    }

    const slots = raw.map((item, index) => {
      const row = (item ?? {}) as SlotInput;
      const title = String(row.title ?? "").trim();
      if (title.length < 2) {
        throw new BadRequestException(`Block ${index + 1} needs a title`);
      }
      const startTime = normalizeHm(String(row.startTime ?? ""));
      const endTime = normalizeHm(String(row.endTime ?? ""));
      if (!startTime || !endTime) {
        throw new BadRequestException(`Block ${index + 1} needs a valid start and end time`);
      }
      const start = parseHmMinutes(startTime)!;
      const end = parseHmMinutes(endTime)!;
      if (end <= start) {
        throw new BadRequestException(`Block ${index + 1} must end after it starts`);
      }
      return {
        title: title.slice(0, 80),
        description: String(row.description ?? "").trim().slice(0, 400),
        startTime,
        endTime,
        start,
        end,
      };
    });

    slots.sort((a, b) => a.start - b.start);
    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        if (slotsOverlap(slots[i].start, slots[i].end, slots[j].start, slots[j].end)) {
          throw new BadRequestException("Time blocks cannot overlap");
        }
      }
    }
    return slots;
  }

  private mapPlan(row: {
    id: string;
    companyId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    deletedAt: Date | null;
    isArchived: boolean;
    version: number;
    metadata: unknown;
    slots: Array<{
      id: string;
      companyId: string;
      planId: string;
      title: string;
      description: string;
      startTime: string;
      endTime: string;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
      createdBy: string | null;
      updatedBy: string | null;
      deletedAt: Date | null;
      isArchived: boolean;
      version: number;
      metadata: unknown;
    }>;
  }) {
    return {
      id: row.id,
      title: row.title,
      slots: row.slots.map((slot) => ({
        id: slot.id,
        planId: slot.planId,
        title: slot.title,
        description: slot.description,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sortOrder: slot.sortOrder,
        companyId: slot.companyId,
        createdAt: iso(slot.createdAt),
        updatedAt: iso(slot.updatedAt),
        createdBy: slot.createdBy ?? "",
        updatedBy: slot.updatedBy ?? "",
        deletedAt: slot.deletedAt ? iso(slot.deletedAt) : null,
        isArchived: slot.isArchived,
        version: slot.version,
        metadata: slot.metadata ?? {},
      })),
      companyId: row.companyId,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      createdBy: row.createdBy ?? "",
      updatedBy: row.updatedBy ?? "",
      deletedAt: row.deletedAt ? iso(row.deletedAt) : null,
      isArchived: row.isArchived,
      version: row.version,
      metadata: row.metadata ?? {},
    };
  }
}
