import { SEED_VERSION, STORAGE_NAMESPACE } from "@/constants/company";
import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { buildSeedPayload } from "@/storage/seeds/build-seed";

export interface StorageMeta {
  seedVersion: number;
  seededAt: string;
  namespace: string;
}

let bootstrapPromise: Promise<void> | null = null;

async function writeSeed(): Promise<void> {
  const storage = getStorageAdapter();
  const seed = buildSeedPayload();

  await Promise.all([
    storage.setItem(StorageKeys.employees, seed.employees),
    storage.setItem(StorageKeys.attendance, seed.attendance),
    storage.setItem(StorageKeys.leave, seed.leave),
    storage.setItem(StorageKeys.schedule, seed.schedule),
    storage.setItem(StorageKeys.settings, seed.settings),
    storage.setItem(StorageKeys.activities, seed.activities),
    storage.setItem(StorageKeys.announcements, seed.announcements),
    storage.setItem(StorageKeys.weeklyStats, seed.weeklyStats),
    storage.setItem(StorageKeys.monthlyStats, seed.monthlyStats),
    storage.setItem(StorageKeys.notifications, seed.notifications),
    storage.setItem(StorageKeys.users, seed.users),
    storage.setItem(StorageKeys.locations, seed.locations),
    storage.setItem(StorageKeys.departments, seed.departments),
    storage.setItem(StorageKeys.positions, seed.positions),
    storage.setItem(StorageKeys.shifts, seed.shifts),
    storage.setItem(StorageKeys.approvalRules, seed.approvalRules),
    storage.setItem(StorageKeys.userPreferences, seed.userPreferences),
    storage.setItem(StorageKeys.workTasks, seed.workTasks),
    storage.setItem(StorageKeys.workMeetings, seed.workMeetings),
    storage.setItem(StorageKeys.targetCategories, seed.targetCategories),
    storage.setItem(StorageKeys.targetTypes, seed.targetTypes),
    storage.setItem(StorageKeys.targetTemplates, seed.targetTemplates),
    storage.setItem(StorageKeys.performanceTargets, seed.performanceTargets),
    storage.setItem(StorageKeys.targetWarnings, seed.targetWarnings),
    storage.setItem(StorageKeys.targetHistory, []),
    storage.setItem(StorageKeys.organicAds, seed.organicAds),
    storage.setItem(StorageKeys.organicAdsSettings, seed.organicAdsSettings),
    storage.setItem(StorageKeys.organicAdHistory, seed.organicAdHistory),
    storage.setItem(StorageKeys.crmStages, seed.crmStages),
    storage.setItem(StorageKeys.crmSubStages, seed.crmSubStages),
    storage.setItem(StorageKeys.crmFeedbackTypes, seed.crmFeedbackTypes),
    storage.setItem(StorageKeys.crmBusinessTypes, seed.crmBusinessTypes),
    storage.setItem(StorageKeys.crmLeads, seed.crmLeads),
    storage.setItem(StorageKeys.crmLeadActivities, seed.crmLeadActivities),
    storage.setItem(StorageKeys.crmLeadFeedback, seed.crmLeadFeedback),
    storage.setItem(StorageKeys.crmLeadHistory, []),
    storage.setItem(StorageKeys.meta, {
      seedVersion: SEED_VERSION,
      seededAt: new Date().toISOString(),
      namespace: STORAGE_NAMESPACE,
    } satisfies StorageMeta),
  ]);
  await storage.removeItem(StorageKeys.payrollState);
}

/** Ensure namespaced demo DB exists. Idempotent. */
export async function ensureStorageBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const storage = getStorageAdapter();
      const meta = await storage.getItem<StorageMeta>(StorageKeys.meta);
      if (meta?.seedVersion === SEED_VERSION) return;
      await writeSeed();
    })().finally(() => {
      /* keep resolved promise so later calls are sync-fast via cached storage */
    });
  }
  await bootstrapPromise;
}

/** Wipe namespace and re-seed (Reset Demo Data). */
export async function resetDemoData(): Promise<void> {
  const storage = getStorageAdapter();
  await storage.clear(`${STORAGE_NAMESPACE}.`);
  bootstrapPromise = null;
  await writeSeed();
  bootstrapPromise = Promise.resolve();
}

/** Remove all namespaced domain data; keep meta so auto-seed does not refill. */
export async function clearDemoData(): Promise<void> {
  const storage = getStorageAdapter();
  await storage.clear(`${STORAGE_NAMESPACE}.`);
  await Promise.all([
    storage.setItem(StorageKeys.employees, []),
    storage.setItem(StorageKeys.attendance, []),
    storage.setItem(StorageKeys.leave, []),
    storage.setItem(StorageKeys.activities, []),
    storage.setItem(StorageKeys.announcements, []),
    storage.setItem(StorageKeys.weeklyStats, []),
    storage.setItem(StorageKeys.monthlyStats, []),
    storage.setItem(StorageKeys.notifications, []),
    storage.setItem(StorageKeys.users, []),
    storage.setItem(StorageKeys.workTasks, []),
    storage.setItem(StorageKeys.workMeetings, []),
    storage.setItem(StorageKeys.meta, {
      seedVersion: SEED_VERSION,
      seededAt: new Date().toISOString(),
      namespace: STORAGE_NAMESPACE,
    } satisfies StorageMeta),
  ]);
  // Required documents stay available after clear.
  const seed = buildSeedPayload();
  await Promise.all([
    storage.setItem(StorageKeys.schedule, {
      ...seed.schedule,
      holidays: [],
    }),
    storage.setItem(StorageKeys.settings, seed.settings),
    storage.setItem(StorageKeys.users, seed.users),
    storage.setItem(StorageKeys.locations, seed.locations),
    storage.setItem(StorageKeys.departments, seed.departments),
    storage.setItem(StorageKeys.positions, seed.positions),
    storage.setItem(StorageKeys.shifts, seed.shifts),
    storage.setItem(StorageKeys.approvalRules, seed.approvalRules),
    storage.setItem(StorageKeys.userPreferences, []),
  ]);
  await storage.removeItem(StorageKeys.payrollState);
  bootstrapPromise = Promise.resolve();
}

/** Force generate sample dataset (alias of reset). */
export async function generateSampleData(): Promise<void> {
  await resetDemoData();
}
