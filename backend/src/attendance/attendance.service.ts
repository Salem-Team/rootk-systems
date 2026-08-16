import { Injectable } from "@nestjs/common";
import type { JwtPayload } from "../common/decorators/current-user";
import type { PunchLocation } from "./attendance-mappers";
import { AttendanceCheckinService } from "./attendance-checkin.service";
import { AttendanceCheckoutService } from "./attendance-checkout.service";
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
    private readonly checkoutService: AttendanceCheckoutService
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
    return this.query.list(companyId, filters, actor);
  }

  meToday(companyId: string, employeeId?: string) {
    return this.query.meToday(companyId, employeeId);
  }

  checkIn(
    companyId: string,
    actorId: string,
    body: {
      employeeId?: string;
      wfh?: boolean;
      note?: string;
      location?: PunchLocation;
    }
  ) {
    return this.checkinService.checkIn(companyId, actorId, body);
  }

  checkOut(
    companyId: string,
    actorId: string,
    body: { employeeId?: string; location?: PunchLocation }
  ) {
    return this.checkoutService.checkOut(companyId, actorId, body);
  }
}
