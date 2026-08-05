import { Module } from "@nestjs/common";
import { DemoController } from "./demo.controller";
import { DemoService } from "./demo.service";
import { RolesGuard } from "../common/roles.guard";

@Module({
  controllers: [DemoController],
  providers: [DemoService, RolesGuard],
})
export class DemoModule {}
