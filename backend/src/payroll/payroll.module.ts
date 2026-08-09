import { Module } from "@nestjs/common";
import { PayrollController } from "./payroll.controller";
import { PayrollService } from "./payroll.service";
import { PayrollPoliciesService } from "./services/payroll-policies.service";
import { PayrollSalaryService } from "./services/payroll-salary.service";
import { PayrollSalaryUpdateService } from "./services/payroll-salary-update.service";
import { PayrollPayslipCalcService } from "./services/payroll-payslip-calc.service";
import { PayrollPayslipQueryService } from "./services/payroll-payslip-query.service";
import { PayrollRunsService } from "./services/payroll-runs.service";
import { PayrollDashboardService } from "./services/payroll-dashboard.service";
import { RolesGuard } from "../common/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [PayrollController],
  providers: [
    PayrollService,
    PayrollPoliciesService,
    PayrollSalaryService,
    PayrollSalaryUpdateService,
    PayrollPayslipCalcService,
    PayrollPayslipQueryService,
    PayrollRunsService,
    PayrollDashboardService,
    RolesGuard,
  ],
  exports: [PayrollService],
})
export class PayrollModule {}
