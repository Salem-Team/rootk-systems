import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceCheckinService } from "./attendance-checkin.service";
import { AttendanceCheckoutService } from "./attendance-checkout.service";
import { AttendanceQueryService } from "./attendance-query.service";
import { AttendanceSharedService } from "./attendance-shared.service";
import { AttendanceService } from "./attendance.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceSharedService,
    AttendanceQueryService,
    AttendanceCheckinService,
    AttendanceCheckoutService,
    AttendanceService,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
