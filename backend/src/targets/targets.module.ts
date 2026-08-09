import { Module } from "@nestjs/common";
import { TargetsController } from "./targets.controller";
import { TargetsService } from "./targets.service";
import { TargetsAssignService } from "./targets-assign.service";
import { TargetsCategoriesService } from "./targets-categories.service";
import { TargetsCrudService } from "./targets-crud.service";
import { TargetsDashboardService } from "./targets-dashboard.service";
import { TargetsDelayedService } from "./targets-delayed.service";
import { TargetsNotifyService } from "./targets-notify.service";
import { TargetsPerformanceService } from "./targets-performance.service";
import { TargetsProgressService } from "./targets-progress.service";
import { TargetsTemplatesService } from "./targets-templates.service";
import { TargetsTypesService } from "./targets-types.service";
import { TargetsWarningsService } from "./targets-warnings.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [TargetsController],
  providers: [
    RolesGuard,
    TargetsNotifyService,
    TargetsCategoriesService,
    TargetsTypesService,
    TargetsTemplatesService,
    TargetsCrudService,
    TargetsAssignService,
    TargetsProgressService,
    TargetsWarningsService,
    TargetsDelayedService,
    TargetsDashboardService,
    TargetsPerformanceService,
    TargetsService,
  ],
  exports: [TargetsService],
})
export class TargetsModule {}
