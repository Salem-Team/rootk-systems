import { Module } from "@nestjs/common";
import { CrmCatalogController } from "./crm-catalog.controller";
import { CrmController } from "./crm.controller";
import { CrmActivitiesService } from "./crm-activities.service";
import { CrmCallsService } from "./crm-calls.service";
import { CrmBusinessTypesService } from "./crm-business-types.service";
import { CrmDashboardService } from "./crm-dashboard.service";
import { CrmFeedbackTypesService } from "./crm-feedback-types.service";
import { CrmFollowUpRemindersService } from "./crm-follow-up-reminders.service";
import { CrmLeadCreateService } from "./crm-lead-create.service";
import { CrmLeadUpdateService } from "./crm-lead-update.service";
import { CrmLeadsImportService } from "./crm-leads-import.service";
import { CrmLeadsService } from "./crm-leads.service";
import { CrmPhoneLookupService } from "./crm-phone-lookup.service";
import { CrmPerformanceService } from "./crm-performance.service";
import { CrmReportsService } from "./crm-reports.service";
import { CrmSharedService } from "./crm-shared.service";
import { CrmStagesService } from "./crm-stages.service";
import { CrmSubStagesService } from "./crm-sub-stages.service";
import { CrmService } from "./crm.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [CrmController, CrmCatalogController],
  providers: [
    RolesGuard,
    CrmSharedService,
    CrmStagesService,
    CrmSubStagesService,
    CrmFeedbackTypesService,
    CrmBusinessTypesService,
    CrmLeadCreateService,
    CrmLeadUpdateService,
    CrmLeadsImportService,
    CrmLeadsService,
    CrmActivitiesService,
    CrmCallsService,
    CrmPhoneLookupService,
    CrmDashboardService,
    CrmPerformanceService,
    CrmReportsService,
    CrmFollowUpRemindersService,
    CrmService,
  ],
  exports: [CrmService],
})
export class CrmModule {}
