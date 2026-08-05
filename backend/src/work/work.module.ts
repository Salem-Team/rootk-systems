import { Module } from "@nestjs/common";
import { WorkController } from "./work.controller";
import { WorkService } from "./work.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [WorkController],
  providers: [WorkService, RolesGuard],
  exports: [WorkService],
})
export class WorkModule {}
