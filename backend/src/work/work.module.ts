import { Module, forwardRef } from "@nestjs/common";
import { WorkController } from "./work.controller";
import { WorkMeetingsService } from "./work-meetings.service";
import { WorkTasksQueryService } from "./work-tasks-query.service";
import { WorkTasksStatusService } from "./work-tasks-status.service";
import { WorkTasksWriteService } from "./work-tasks-write.service";
import { WorkTasksService } from "./work-tasks.service";
import { WorkService } from "./work.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";
import { TargetsModule } from "../targets/targets.module";

@Module({
  imports: [NotificationsModule, forwardRef(() => TargetsModule)],
  controllers: [WorkController],
  providers: [
    WorkTasksQueryService,
    WorkTasksWriteService,
    WorkTasksStatusService,
    WorkTasksService,
    WorkMeetingsService,
    WorkService,
    RolesGuard,
  ],
  exports: [WorkService],
})
export class WorkModule {}
