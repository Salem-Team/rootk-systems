import { Module } from "@nestjs/common";
import { TargetsController } from "./targets.controller";
import { TargetsService } from "./targets.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [TargetsController],
  providers: [TargetsService, RolesGuard],
  exports: [TargetsService],
})
export class TargetsModule {}
