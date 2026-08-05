import { Module } from "@nestjs/common";
import { PayrollController } from "./payroll.controller";
import { PayrollService } from "./payroll.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [PayrollController],
  providers: [PayrollService, RolesGuard],
  exports: [PayrollService],
})
export class PayrollModule {}
