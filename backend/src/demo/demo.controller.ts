import { Controller, Delete, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DemoService } from "./demo.service";
import { CompanyId } from "../common/tenant";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AppRole } from "../common/roles";

@Controller("demo")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(AppRole.admin)
export class DemoController {
  constructor(private readonly service: DemoService) {}

  @Post("reset")
  reset(@CompanyId() companyId: string) {
    return this.service.reset(companyId);
  }

  @Post("generate")
  generate(@CompanyId() companyId: string) {
    return this.service.generate(companyId);
  }

  @Delete()
  clear(@CompanyId() companyId: string) {
    return this.service.clear(companyId);
  }
}
