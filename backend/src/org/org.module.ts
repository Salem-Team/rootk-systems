import { Module } from "@nestjs/common";
import { OrgController } from "./org.controller";
import { OrgApprovalsService } from "./org-approvals.service";
import { OrgDepartmentsService } from "./org-departments.service";
import { OrgLocationsService } from "./org-locations.service";
import { OrgPositionsService } from "./org-positions.service";
import { OrgShiftsService } from "./org-shifts.service";
import { OrgService } from "./org.service";
import { RolesGuard } from "../common/roles.guard";

@Module({
  controllers: [OrgController],
  providers: [
    OrgLocationsService,
    OrgDepartmentsService,
    OrgPositionsService,
    OrgShiftsService,
    OrgApprovalsService,
    OrgService,
    RolesGuard,
  ],
  exports: [OrgService],
})
export class OrgModule {}
