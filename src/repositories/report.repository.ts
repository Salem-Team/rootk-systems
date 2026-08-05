import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { BaseRepository } from "@/repositories/base.repository";
import type { MonthlyStat, WeeklyStat } from "@/types";

export class ReportRepository extends BaseRepository {
  constructor() {
    super(getStorageAdapter());
  }

  async getWeeklyStats(): Promise<WeeklyStat[]> {
    return this.withLatency(async () => {
      const items =
        (await this.storage.getItem<WeeklyStat[]>(StorageKeys.weeklyStats)) ??
        [];
      return items.filter((i) => !i.deletedAt);
    });
  }

  async getMonthlyStats(): Promise<MonthlyStat[]> {
    return this.withLatency(async () => {
      const items =
        (await this.storage.getItem<MonthlyStat[]>(StorageKeys.monthlyStats)) ??
        [];
      return items.filter((i) => !i.deletedAt);
    });
  }
}

export const reportRepository = new ReportRepository();
