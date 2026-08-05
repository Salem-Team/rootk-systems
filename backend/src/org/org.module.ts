import { Module } from "@nestjs/common";
import { OrgController } from "./org.controller";
import { OrgService } from "./org.service";
import { RolesGuard } from "../common/roles.guard";

@Module({
  controllers: [OrgController],
  providers: [OrgService, RolesGuard],
  exports: [OrgService],
})
export class OrgModule {}
