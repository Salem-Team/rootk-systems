import { Module } from "@nestjs/common";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { RolesGuard } from "../common/roles.guard";

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService, RolesGuard],
  exports: [ScheduleService],
})
export class ScheduleModule {}
