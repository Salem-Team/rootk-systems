import { Module, forwardRef } from "@nestjs/common";
import { WorkController } from "./work.controller";
import { WorkService } from "./work.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";
import { TargetsModule } from "../targets/targets.module";

@Module({
  imports: [NotificationsModule, forwardRef(() => TargetsModule)],
  controllers: [WorkController],
  providers: [WorkService, RolesGuard],
  exports: [WorkService],
})
export class WorkModule {}
