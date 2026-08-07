import {
  Controller,
  UseGuards,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PayrollService } from "./payroll.service";
import { ActorId, CompanyId } from "../common/tenant";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AppRole, isEmployeeRole } from "../common/roles";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";

function assertOwnPayroll(user: JwtPayload, employeeId: string) {
  if (isEmployeeRole(user.role) && user.employeeId !== employeeId) {
    throw new ForbiddenException("Cannot access another employee's payroll");
  }
}

@Controller("payroll")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get("dashboard")
  @Roles(AppRole.admin, AppRole.employee)
  dashboard(@CompanyId() companyId: string) {
    return this.service.dashboard(companyId);
  }

  @Get("policies")
  @Roles(AppRole.admin)
  policies(@CompanyId() companyId: string) {
    return this.service.policies(companyId);
  }

  @Patch("policies")
  @Roles(AppRole.admin)
  patchPolicies(
    @CompanyId() companyId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.patchPolicies(companyId, body);
  }

  @Get("rules")
  @Roles(AppRole.admin)
  rules(@CompanyId() companyId: string) {
    return this.service.rules(companyId);
  }

  @Patch("rules/:id/toggle")
  @Roles(AppRole.admin)
  toggle(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() body: { enabled: boolean }
  ) {
    return this.service.toggleRule(companyId, id, body.enabled);
  }

  @Post("runs/advance")
  @Roles(AppRole.admin)
  advance(@CompanyId() companyId: string, @ActorId() actorId: string) {
    return this.service.advance(companyId, actorId);
  }

  @Get("runs")
  @Roles(AppRole.admin)
  runs(@CompanyId() companyId: string) {
    return this.service.listRuns(companyId);
  }

  @Get("reports")
  @Roles(AppRole.admin)
  reports(@CompanyId() companyId: string) {
    return this.service.reports(companyId);
  }

  @Get("payslips")
  @Roles(AppRole.admin)
  payslips(@CompanyId() companyId: string) {
    return this.service.payslips(companyId);
  }

  @Get("payslips/:employeeId/history")
  @Roles(AppRole.admin, AppRole.employee)
  history(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param("employeeId") employeeId: string
  ) {
    assertOwnPayroll(user, employeeId);
    return this.service.history(companyId, employeeId);
  }

  @Get("payslips/:employeeId")
  @Roles(AppRole.admin, AppRole.employee)
  payslip(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param("employeeId") employeeId: string
  ) {
    assertOwnPayroll(user, employeeId);
    return this.service.payslip(companyId, employeeId);
  }

  @Get("salary-profiles")
  @Roles(AppRole.admin)
  salaryProfiles(@CompanyId() companyId: string) {
    return this.service.listSalaryProfiles(companyId);
  }

  @Get("salary-profiles/:employeeId")
  @Roles(AppRole.admin, AppRole.employee)
  salary(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param("employeeId") employeeId: string
  ) {
    assertOwnPayroll(user, employeeId);
    return this.service.salaryProfile(companyId, employeeId);
  }

  @Patch("salary-profiles/:employeeId")
  @Roles(AppRole.admin)
  patchSalary(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("employeeId") employeeId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.patchSalaryProfile(companyId, employeeId, body, actorId);
  }
}
