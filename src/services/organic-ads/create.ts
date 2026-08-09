import { postOrganicAd } from "@/api/organic-ads.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { inspectAdUrl, normalizeAdUrl } from "@/lib/organic-ads-url";
import { emitOrganicAdsUpdated } from "@/lib/events";
import { organicAdvertisementRepository } from "@/repositories/organic-ads.repository";
import { employeeRepository } from "@/repositories";
import {
  createOrganicAdSchema,
  type CreateOrganicAdSchemaInput,
} from "@/schemas/organic-ads.schema";
import { fail, fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionRole, getSessionUserId, getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type { OrganicAdvertisement } from "@/types/organic-ads";
import {
  assertCap,
  completeLinkedTaskLocal,
  defaultSettings,
  findDuplicate,
  findOpenLinkableTaskLocal,
  writeHistory,
} from "./helpers";

export async function createOrganicAd(
  input: CreateOrganicAdSchemaInput
): Promise<ApiResponse<OrganicAdvertisement | null>> {
  try {
    if (isApiMode()) return postOrganicAd(input);
    await simulateDelay();
    assertCap("create");
    const parsed = createOrganicAdSchema.parse(input);
    const role = getSessionRole();
    const ownerEmployeeId = getWorkEmployeeId();
    if (!ownerEmployeeId && role !== "admin") {
      throw new ValidationError(
        "Your account is not linked to an employee profile"
      );
    }
    const ownerId =
      ownerEmployeeId ??
      (await employeeRepository.findAll()).find((e) => e.status === "active")
        ?.id;
    if (!ownerId) {
      throw new ValidationError("No employee profile available to own this ad");
    }

    const inspected = inspectAdUrl(parsed.url);
    if (
      inspected.validationStatus === "invalid" ||
      inspected.validationStatus === "unsupported"
    ) {
      throw new ValidationError(inspected.validationMessage);
    }

    const all = (await organicAdvertisementRepository.findAll()).filter(
      (a) => !a.deletedAt
    );
    const duplicate = findDuplicate(
      all,
      inspected.canonicalUrl,
      inspected.externalId,
      inspected.platform
    );

    if (duplicate && !parsed.forceDuplicate) {
      return fail(
        null,
        "This advertisement has already been added",
        "DUPLICATE_AD",
        { duplicate }
      );
    }

    if (duplicate && parsed.forceDuplicate) {
      assertCap("override_duplicate");
      const settings = await defaultSettings();
      if (!settings.allowDuplicateOverride) {
        throw new ForbiddenError("Duplicate override is disabled");
      }
    }

    const now = new Date().toISOString();
    const status: OrganicAdvertisement["status"] =
      inspected.validationStatus === "valid"
        ? duplicate && parsed.forceDuplicate
          ? "needs_review"
          : "active"
        : "needs_review";

    const shouldLink = parsed.linkToOpenTask !== false;
    let linkTask =
      shouldLink || parsed.workTaskId || parsed.targetId
        ? await findOpenLinkableTaskLocal(
            ownerId,
            parsed.workTaskId,
            parsed.targetId
          )
        : null;

    let entity: OrganicAdvertisement = enrichWithAudit(
      {
        id: createId("oad"),
        ownerEmployeeId: ownerId,
        platform: inspected.platform,
        adType: inspected.adType,
        url: parsed.url.trim(),
        canonicalUrl: inspected.canonicalUrl || normalizeAdUrl(parsed.url),
        externalId: inspected.externalId,
        project: parsed.project ?? "",
        campaign: parsed.campaign ?? "",
        notes: parsed.notes ?? "",
        status,
        validationStatus: inspected.validationStatus,
        validationMessage: inspected.validationMessage,
        duplicateOfId: duplicate && parsed.forceDuplicate ? duplicate.id : null,
        similarityScore: null,
        addedAt: now,
        lastVerifiedAt: now,
        leadsCount: null,
        qualifiedLeadsCount: null,
        dealsCount: null,
        workTaskId: linkTask?.id ?? null,
        targetId: linkTask?.targetId ?? parsed.targetId ?? null,
      } satisfies Omit<
        OrganicAdvertisement,
        | "companyId"
        | "createdAt"
        | "updatedAt"
        | "createdBy"
        | "updatedBy"
        | "deletedAt"
        | "isArchived"
        | "version"
        | "metadata"
      >,
      getSessionUserId() || ownerId
    );

    await organicAdvertisementRepository.create(entity);

    if (linkTask && status === "active") {
      try {
        await completeLinkedTaskLocal(
          linkTask.id,
          entity.url,
          entity.platform
        );
      } catch {
        entity = touchEntity(entity, getSessionUserId() || ownerId, {
          workTaskId: null,
        });
        await organicAdvertisementRepository.update(entity.id, entity);
        linkTask = null;
      }
    }

    const employees = await employeeRepository.findAll();
    const actorName =
      employees.find((e) => e.id === ownerId)?.name ??
      (role === "admin" ? "Admin" : "Sales");

    await writeHistory({
      advertisementId: entity.id,
      action: parsed.forceDuplicate ? "override_duplicate" : "created",
      actorId: getSessionUserId() || ownerId,
      actorName,
      note: linkTask
        ? `Added a ${inspected.platform} advertisement and advanced linked target task`
        : `Added a ${inspected.platform} advertisement`,
      previousValue: null,
      newValue: entity.status,
    });

    emitOrganicAdsUpdated();
    return ok(entity, "Advertisement added");
  } catch (error) {
    return fromError(error, null);
  }
}
