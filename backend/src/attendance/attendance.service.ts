import { Injectable } from "@nestjs/common";
import type { JwtPayload } from "../common/decorators/current-user";
import type { PunchLocation } from "./attendance-mappers";
import { AttendanceAutoCheckoutService } from "./attendance-auto-checkout.service";
import { AttendanceCheckinService } from "./attendance-checkin.service";
import { AttendanceCheckoutService } from "./attendance-checkout.service";
import { AttendanceLateDeductionService } from "./attendance-late-deduction.service";
import { AttendanceQueryService } from "./attendance-query.service";

/**
 * Thin facade preserving the original `AttendanceService` public API.
 * All business logic lives in the domain services below.
 */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly query: AttendanceQueryService,
    private readonly checkinService: AttendanceCheckinService,
    private readonly checkoutService: AttendanceCheckoutService,
    private readonly autoCheckout: AttendanceAutoCheckoutService,
    private readonly lateDeduction: AttendanceLateDeductionService
  ) {}

  list(
    companyId: string,
    filters: {
      employeeId?: string;
      date?: string;
      status?: string;
      from?: string;
      to?: string;
    } = {},
    actor?: JwtPayload
  ) {
    return this.withLateDeduction(companyId, async () => {
      await this.autoCheckout.closeElapsed(new Date(), companyId);
      return this.query.list(companyId, filters, actor);
    });
  }

  meToday(companyId: string, employeeId?: string) {
    return this.withLateDeduction(companyId, async () => {
      await this.autoCheckout.closeElapsed(new Date(), companyId);
      const row = await this.query.meToday(companyId, employeeId);
      return row ? [row] : [];
    }).then((rows) => rows[0] ?? null);
  }

  async checkIn(
    companyId: string,
    actorId: string,
    body: {
      employeeId?: string;
      wfh?: boolean;
      note?: string;
      location?: PunchLocation;
    }
  ) {
    const row = await this.checkinService.checkIn(companyId, actorId, body);
    const [enriched] = await this.lateDeduction.enrich(companyId, [row]);
    return enriched ?? row;
  }

  async checkOut(
    companyId: string,
    actorId: string,
    body: { employeeId?: string; location?: PunchLocation }
  ) {
    const row = await this.checkoutService.checkOut(companyId, actorId, body);
    const [enriched] = await this.lateDeduction.enrich(companyId, [row]);
    return enriched ?? row;
  }

  private async withLateDeduction<T extends { employeeId: string; date: string; checkIn?: string }>(
    companyId: string,
    load: () => Promise<T[]>
  ) {
    const rows = await load();
    return this.lateDeduction.enrich(companyId, rows);
  }
}
