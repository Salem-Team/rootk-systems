import { Module } from "@nestjs/common";
import { LeaveController } from "./leave.controller";
import { LeaveService } from "./leave.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [LeaveController],
  providers: [LeaveService, RolesGuard],
  exports: [LeaveService],
})
export class LeaveModule {}
