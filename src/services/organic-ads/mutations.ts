import {
  deleteOrganicAdRemote,
  patchOrganicAd,
  patchOrganicAdsSettings,
} from "@/api/organic-ads.api";
import { isApiMode } from "@/lib/env";
import { touchEntity } from "@/lib/entity";
import { NotFoundError } from "@/lib/errors";
import { emitOrganicAdsUpdated } from "@/lib/events";
import { organicAdsSettingsRepository, organicAdvertisementRepository } from "@/repositories/organic-ads.repository";
import {
  organicAdsSettingsSchema,
  updateOrganicAdSchema,
  type OrganicAdsSettingsInput,
  type UpdateOrganicAdSchemaInput,
} from "@/schemas/organic-ads.schema";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionRole, getSessionUserId, getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type { OrganicAdsSettings, OrganicAdvertisement } from "@/types/organic-ads";
import {
  assertCap,
  completeLinkedTaskLocal,
  defaultSettings,
  reopenLinkedTaskLocal,
  scopedAds,
  writeHistory,
} from "./helpers";

export async function updateOrganicAd(
  id: string,
  input: UpdateOrganicAdSchemaInput
): Promise<ApiResponse<OrganicAdvertisement | null>> {
  try {
    if (isApiMode()) return patchOrganicAd(id, input);
    await simulateDelay();
    const ads = await scopedAds();
    const existing = ads.find((a) => a.id === id);
    if (!existing) throw new NotFoundError("Advertisement not found");

    const role = getSessionRole();
    const isOwner = existing.ownerEmployeeId === getWorkEmployeeId();
    if (isOwner) assertCap("edit_own");
    else assertCap("edit_team");

    const parsed = updateOrganicAdSchema.parse(input);
    const previousStatus = existing.status;
    const nextStatus = parsed.status ?? existing.status;
    const updated = touchEntity(
      existing,
      getSessionUserId() || existing.ownerEmployeeId,
      {
        project: parsed.project ?? existing.project,
        campaign: parsed.campaign ?? existing.campaign,
        notes: parsed.notes ?? existing.notes,
        status: nextStatus,
      }
    );
    await organicAdvertisementRepository.update(id, updated);

    if (existing.workTaskId && nextStatus !== previousStatus) {
      if (nextStatus === "active" && previousStatus !== "active") {
        await completeLinkedTaskLocal(
          existing.workTaskId,
          updated.url,
          updated.platform
        );
      }
      if (
        (nextStatus === "inactive" || nextStatus === "duplicate") &&
        previousStatus === "active"
      ) {
        await reopenLinkedTaskLocal(existing.workTaskId);
      }
    }

    if (parsed.status && parsed.status !== previousStatus) {
      await writeHistory({
        advertisementId: id,
        action: "status_changed",
        actorId: getSessionUserId() || existing.ownerEmployeeId,
        actorName: role === "admin" ? "Admin" : "Sales",
        note: `Changed status to ${parsed.status}`,
        previousValue: previousStatus,
        newValue: parsed.status,
      });
    } else {
      await writeHistory({
        advertisementId: id,
        action: "updated",
        actorId: getSessionUserId() || existing.ownerEmployeeId,
        actorName: role === "admin" ? "Admin" : "Sales",
        note: "Updated advertisement",
        previousValue: null,
        newValue: null,
      });
    }

    emitOrganicAdsUpdated();
    return ok(updated, "Advertisement updated");
  } catch (error) {
    return fromError(error, null);
  }
}

export async function deleteOrganicAd(
  id: string
): Promise<ApiResponse<boolean>> {
  try {
    if (isApiMode()) return deleteOrganicAdRemote(id);
    await simulateDelay();
    const ads = await scopedAds();
    const existing = ads.find((a) => a.id === id);
    if (!existing) throw new NotFoundError("Advertisement not found");

    const isOwner = existing.ownerEmployeeId === getWorkEmployeeId();
    if (isOwner) assertCap("delete_own");
    else assertCap("delete_team");

    if (existing.workTaskId && existing.status === "active") {
      await reopenLinkedTaskLocal(existing.workTaskId);
    }

    await organicAdvertisementRepository.delete(id);
    await writeHistory({
      advertisementId: id,
      action: "deleted",
      actorId: getSessionUserId() || existing.ownerEmployeeId,
      actorName: getSessionRole() === "admin" ? "Admin" : "Sales",
      note: "Deleted advertisement",
      previousValue: existing.status,
      newValue: "deleted",
    });
    emitOrganicAdsUpdated();
    return ok(true, "Advertisement deleted");
  } catch (error) {
    return fromError(error, false);
  }
}

export async function updateOrganicAdsSettings(
  input: OrganicAdsSettingsInput
): Promise<ApiResponse<OrganicAdsSettings | null>> {
  try {
    if (isApiMode()) return patchOrganicAdsSettings(input);
    await simulateDelay();
    assertCap("manage_settings");
    const parsed = organicAdsSettingsSchema.parse(input);
    const current = await defaultSettings();
    const updated = touchEntity(current, getSessionUserId() || "admin", parsed);
    await organicAdsSettingsRepository.set(updated);
    emitOrganicAdsUpdated();
    return ok(updated, "Settings saved");
  } catch (error) {
    return fromError(error, null);
  }
}
