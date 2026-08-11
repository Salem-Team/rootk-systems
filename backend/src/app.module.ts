import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { PermissionsGuard } from "./common/permissions.guard";
import { PermissionsModule } from "./permissions/permissions.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { EmployeesModule } from "./employees/employees.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { LeaveModule } from "./leave/leave.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { SettingsModule } from "./settings/settings.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { UsersModule } from "./users/users.module";
import { WorkModule } from "./work/work.module";
import { OrgModule } from "./org/org.module";
import { PayrollModule } from "./payroll/payroll.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DemoModule } from "./demo/demo.module";
import { PreferencesModule } from "./preferences/preferences.module";
import { TargetsModule } from "./targets/targets.module";
import { OrganicAdsModule } from "./organic-ads/organic-ads.module";
import { CrmModule } from "./crm/crm.module";
import { DailyPlanModule } from "./daily-plan/daily-plan.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    EmployeesModule,
    AttendanceModule,
    LeaveModule,
    ScheduleModule,
    SettingsModule,
    NotificationsModule,
    UsersModule,
    PermissionsModule,
    PreferencesModule,
    WorkModule,
    OrgModule,
    PayrollModule,
    DashboardModule,
    DemoModule,
    TargetsModule,
    OrganicAdsModule,
    CrmModule,
    DailyPlanModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
