import { Module, forwardRef } from "@nestjs/common";
import { OrganicAdsController } from "./organic-ads.controller";
import { OrganicAdsService } from "./organic-ads.service";
import { OrganicAdsSettingsService } from "./services/organic-ads-settings.service";
import { OrganicAdsHistoryService } from "./services/organic-ads-history.service";
import { OrganicAdsTaskLinkService } from "./services/organic-ads-task-link.service";
import { OrganicAdsQueryService } from "./services/organic-ads-query.service";
import { OrganicAdsCreateService } from "./services/organic-ads-create.service";
import { OrganicAdsMutationService } from "./services/organic-ads-mutation.service";
import { OrganicAdsOverviewService } from "./services/organic-ads-overview.service";
import { OrganicAdsPerformanceService } from "./services/organic-ads-performance.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";
import { WorkModule } from "../work/work.module";

@Module({
  imports: [NotificationsModule, forwardRef(() => WorkModule)],
  controllers: [OrganicAdsController],
  providers: [
    OrganicAdsService,
    OrganicAdsSettingsService,
    OrganicAdsHistoryService,
    OrganicAdsTaskLinkService,
    OrganicAdsQueryService,
    OrganicAdsCreateService,
    OrganicAdsMutationService,
    OrganicAdsOverviewService,
    OrganicAdsPerformanceService,
    RolesGuard,
  ],
  exports: [OrganicAdsService],
})
export class OrganicAdsModule {}
