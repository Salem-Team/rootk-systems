import { getStorageAdapter } from "@/storage";
import { ensureStorageBootstrapped } from "@/storage/bootstrap";
import { StorageKeys } from "@/storage/keys";
import type { DailyPlan } from "@/types/daily-plan";

export class DailyPlanRepository {
  private readonly storage = getStorageAdapter();
  private readonly key = StorageKeys.dailyPlan;

  async get(): Promise<DailyPlan | null> {
    await ensureStorageBootstrapped();
    return this.storage.getItem<DailyPlan>(this.key);
  }

  async set(plan: DailyPlan): Promise<DailyPlan> {
    await ensureStorageBootstrapped();
    await this.storage.setItem(this.key, plan);
    return plan;
  }
}

export const dailyPlanRepository = new DailyPlanRepository();
