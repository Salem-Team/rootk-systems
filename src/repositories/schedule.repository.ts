import { NotFoundError } from "@/lib/errors";
import { touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { BaseRepository } from "@/repositories/base.repository";
import { enrichWithAudit } from "@/lib/entity";
import type { Holiday, WorkSchedule } from "@/types";

export class ScheduleRepository extends BaseRepository {
  constructor() {
    super(getStorageAdapter());
  }

  private async read(): Promise<WorkSchedule> {
    await this.ready();
    const schedule = await this.storage.getItem<WorkSchedule>(StorageKeys.schedule);
    if (!schedule) throw new NotFoundError("Work schedule not found");
    return schedule;
  }

  private async write(schedule: WorkSchedule): Promise<void> {
    await this.storage.setItem(StorageKeys.schedule, schedule);
  }

  async get(): Promise<WorkSchedule> {
    return this.withLatency(async () => {
      const schedule = await this.read();
      return {
        ...schedule,
        holidays: [...schedule.holidays],
        workingDays: [...schedule.workingDays],
        weekendDays: [...schedule.weekendDays],
        wfhDays: [...schedule.wfhDays],
      };
    });
  }

  /** Sync-safe read for attendance business rules (no extra latency). */
  async getSyncSafe(): Promise<WorkSchedule> {
    await this.ready();
    const schedule = await this.storage.getItem<WorkSchedule>(StorageKeys.schedule);
    if (!schedule) throw new NotFoundError("Work schedule not found");
    return schedule;
  }

  async update(
    patch: Partial<Omit<WorkSchedule, "holidays" | "id">>,
    actorId = "system"
  ): Promise<WorkSchedule> {
    return this.withLatency(async () => {
      const current = await this.read();
      const next = touchEntity<WorkSchedule>(current, actorId, {
        ...patch,
        holidays: current.holidays,
        id: current.id,
        metadata: {
          ...current.metadata,
          ...(patch.metadata ?? {}),
        },
      });
      await this.write(next);
      return {
        ...next,
        holidays: [...next.holidays],
      };
    });
  }

  async listHolidays(type?: Holiday["type"]): Promise<Holiday[]> {
    return this.withLatency(async () => {
      const schedule = await this.read();
      let holidays = schedule.holidays.filter((h) => !h.deletedAt);
      if (type) holidays = holidays.filter((h) => h.type === type);
      return holidays.sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  async addHoliday(
    input: {
      id?: string;
      name: string;
      date: string;
      type: Holiday["type"];
      description?: string;
    },
    actorId = "system"
  ): Promise<Holiday> {
    return this.withLatency(async () => {
      const schedule = await this.read();
      const holiday = enrichWithAudit(
        {
          id: input.id ?? createId("hol"),
          name: input.name,
          date: input.date,
          type: input.type,
          description: input.description,
        },
        actorId
      );
      const next = touchEntity(schedule, actorId, {
        holidays: [...schedule.holidays, holiday].sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      });
      await this.write(next);
      return holiday;
    });
  }

  async removeHoliday(id: string, actorId = "system"): Promise<boolean> {
    return this.withLatency(async () => {
      const schedule = await this.read();
      const index = schedule.holidays.findIndex((h) => h.id === id);
      if (index === -1) return false;
      const holidays = [...schedule.holidays];
      holidays.splice(index, 1);
      await this.write(touchEntity(schedule, actorId, { holidays }));
      return true;
    });
  }
}

export const scheduleRepository = new ScheduleRepository();
