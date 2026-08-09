import { Module } from "@nestjs/common";
import { EmployeesController } from "./employees.controller";
import { EmployeesCreateService } from "./employees-create.service";
import { EmployeesQueryService } from "./employees-query.service";
import { EmployeesRemoveService } from "./employees-remove.service";
import { EmployeesUpdateService } from "./employees-update.service";
import { EmployeesService } from "./employees.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesQueryService,
    EmployeesCreateService,
    EmployeesUpdateService,
    EmployeesRemoveService,
    EmployeesService,
    RolesGuard,
  ],
  exports: [EmployeesService],
})
export class EmployeesModule {}
