import { Module } from "@nestjs/common";
import { PreferencesController } from "./preferences.controller";
import { PreferencesService } from "./preferences.service";
import { RolesGuard } from "../common/roles.guard";

@Module({
  controllers: [PreferencesController],
  providers: [PreferencesService, RolesGuard],
})
export class PreferencesModule {}
