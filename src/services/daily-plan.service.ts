import { fetchDailyPlan, putDailyPlan } from "@/api/daily-plan.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { emitDailyPlanUpdated } from "@/lib/events";
import { createId } from "@/lib/id";
import {
  findOverlappingSlots,
  parseHmMinutes,
  sortDailyPlanSlots,
} from "@/lib/daily-plan";
import { dailyPlanRepository } from "@/repositories/daily-plan.repository";
import {
  saveDailyPlanSchema,
  type SaveDailyPlanDto,
} from "@/schemas/daily-plan.schema";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import {
  getSessionPermissions,
  getSessionRole,
  getSessionUserId,
} from "@/stores/session-store";
import { hasPermissionId } from "@/constants/permissions";
import type { ApiResponse, DailyPlan } from "@/types";
import { dailyPlanSeed } from "@/mocks/daily-plan";

function emptyPlan(): DailyPlan {
  return {
    id: "",
    title: "Daily Plan",
    slots: [],
    companyId: "",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 0,
    metadata: {},
  };
}

async function ensureLocalPlan(): Promise<DailyPlan> {
  const existing = await dailyPlanRepository.get();
  if (existing) {
    return {
      ...existing,
      slots: sortDailyPlanSlots(existing.slots ?? []),
    };
  }
  await dailyPlanRepository.set(dailyPlanSeed);
  return dailyPlanSeed;
}

export async function getDailyPlan(): Promise<ApiResponse<DailyPlan>> {
  try {
    if (isApiMode()) return fetchDailyPlan();
    await simulateDelay();
    return ok(await ensureLocalPlan());
  } catch (error) {
    return fromError(error, emptyPlan());
  }
}

export async function saveDailyPlan(
  input: SaveDailyPlanDto
): Promise<ApiResponse<DailyPlan>> {
  try {
    if (
      !hasPermissionId(
        "dailyPlan.editCompanyPlan",
        getSessionPermissions(),
        getSessionRole()
      )
    ) {
      throw new ForbiddenError("You do not have permission to edit the daily plan");
    }
    const parsed = saveDailyPlanSchema.parse(input);
    for (const slot of parsed.slots) {
      const start = parseHmMinutes(slot.startTime);
      const end = parseHmMinutes(slot.endTime);
      if (start == null || end == null || end <= start) {
        throw new ValidationError("Each block must end after it starts");
      }
    }
    const overlapIds = findOverlappingSlots(
      parsed.slots.map((slot, index) => ({
        id: slot.id ?? String(index),
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
    );
    if (overlapIds.length > 0) {
      throw new ValidationError("Time blocks cannot overlap");
    }

    if (isApiMode()) {
      const res = await putDailyPlan(parsed);
      if (res.success) emitDailyPlanUpdated();
      return res;
    }

    await simulateDelay();
    const actor = getSessionUserId();
    const current = await ensureLocalPlan();
    const nextSlots = sortDailyPlanSlots(
      parsed.slots.map((slot, index) => {
        const existing = slot.id
          ? current.slots.find((s) => s.id === slot.id)
          : undefined;
        const base = {
          id: existing?.id ?? createId("dps"),
          planId: current.id || "dplan-001",
          title: slot.title,
          description: slot.description ?? "",
          startTime: slot.startTime,
          endTime: slot.endTime,
          sortOrder: index,
        };
        return existing
          ? touchEntity(existing, actor, base)
          : enrichWithAudit(base, actor);
      })
    );
    const next = touchEntity(current, actor, {
      title: parsed.title?.trim() || current.title,
      slots: nextSlots,
    });
    await dailyPlanRepository.set(next);
    emitDailyPlanUpdated();
    return ok(next, "Daily plan saved");
  } catch (error) {
    return fromError(error, emptyPlan());
  }
}
