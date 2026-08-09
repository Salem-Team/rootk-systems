import { Injectable } from "@nestjs/common";
import { EmployeesCreateService } from "./employees-create.service";
import { EmployeesQueryService } from "./employees-query.service";
import { EmployeesRemoveService } from "./employees-remove.service";
import { EmployeesUpdateService } from "./employees-update.service";

/**
 * Thin facade preserving the original `EmployeesService` public API.
 * All business logic lives in the domain services below.
 */
@Injectable()
export class EmployeesService {
  constructor(
    private readonly query: EmployeesQueryService,
    private readonly createService: EmployeesCreateService,
    private readonly updateService: EmployeesUpdateService,
    private readonly removeService: EmployeesRemoveService
  ) {}

  list(
    companyId: string,
    filters: {
      query?: string;
      department?: string;
      status?: string;
      location?: string;
    } = {}
  ) {
    return this.query.list(companyId, filters);
  }

  byId(companyId: string, id: string) {
    return this.query.byId(companyId, id);
  }

  create(
    companyId: string,
    actorId: string,
    body: {
      name: string;
      email: string;
      department: string;
      position: string;
      location?: string;
      phone?: string;
      joinDate: string;
      status?: string;
      manager?: string;
      employeeId?: string;
      password: string;
    }
  ) {
    return this.createService.create(companyId, actorId, body);
  }

  update(
    companyId: string,
    actorId: string,
    id: string,
    body: Record<string, unknown>
  ) {
    return this.updateService.update(companyId, actorId, id, body);
  }

  updateStatus(companyId: string, actorId: string, id: string, status: string) {
    return this.updateService.updateStatus(companyId, actorId, id, status);
  }

  remove(companyId: string, actorId: string, id: string) {
    return this.removeService.remove(companyId, actorId, id);
  }

  profileExtras(companyId: string, id: string) {
    return this.query.profileExtras(companyId, id);
  }
}
