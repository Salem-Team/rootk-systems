import { Module } from "@nestjs/common";
import { CrmCatalogController } from "./crm-catalog.controller";
import { CrmController } from "./crm.controller";
import { CrmActivitiesService } from "./crm-activities.service";
import { CrmBusinessTypesService } from "./crm-business-types.service";
import { CrmDashboardService } from "./crm-dashboard.service";
import { CrmFeedbackTypesService } from "./crm-feedback-types.service";
import { CrmLeadCreateService } from "./crm-lead-create.service";
import { CrmLeadUpdateService } from "./crm-lead-update.service";
import { CrmLeadsImportService } from "./crm-leads-import.service";
import { CrmLeadsService } from "./crm-leads.service";
import { CrmPerformanceService } from "./crm-performance.service";
import { CrmReportsService } from "./crm-reports.service";
import { CrmSharedService } from "./crm-shared.service";
import { CrmStagesService } from "./crm-stages.service";
import { CrmService } from "./crm.service";
import { RolesGuard } from "../common/roles.guard";

@Module({
  controllers: [CrmController, CrmCatalogController],
  providers: [
    RolesGuard,
    CrmSharedService,
    CrmStagesService,
    CrmFeedbackTypesService,
    CrmBusinessTypesService,
    CrmLeadCreateService,
    CrmLeadUpdateService,
    CrmLeadsImportService,
    CrmLeadsService,
    CrmActivitiesService,
    CrmDashboardService,
    CrmPerformanceService,
    CrmReportsService,
    CrmService,
  ],
  exports: [CrmService],
})
export class CrmModule {}
