import { Module } from "@nestjs/common";
import { DailyPlanController } from "./daily-plan.controller";
import { DailyPlanService } from "./daily-plan.service";
import { DailyPlanReportService } from "./daily-plan-report.service";
import { RolesGuard } from "../common/roles.guard";

@Module({
  controllers: [DailyPlanController],
  providers: [DailyPlanService, DailyPlanReportService, RolesGuard],
  exports: [DailyPlanService],
})
export class DailyPlanModule {}
