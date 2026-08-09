import { Injectable } from "@nestjs/common";
import { OrgApprovalsService } from "./org-approvals.service";
import { OrgDepartmentsService } from "./org-departments.service";
import { OrgLocationsService } from "./org-locations.service";
import { OrgPositionsService } from "./org-positions.service";
import { OrgShiftsService } from "./org-shifts.service";

/**
 * Thin facade preserving the original `OrgService` public API.
 * All business logic lives in the domain services below.
 */
@Injectable()
export class OrgService {
  constructor(
    private readonly locations: OrgLocationsService,
    private readonly departments: OrgDepartmentsService,
    private readonly positions: OrgPositionsService,
    private readonly shifts: OrgShiftsService,
    private readonly approvals: OrgApprovalsService
  ) {}

  // ── Locations ───────────────────────────────────────────────────────────

  listLocations(companyId: string) {
    return this.locations.listLocations(companyId);
  }

  resolveMapsUrl(url: string) {
    return this.locations.resolveMapsUrl(url);
  }

  upsertLocation(companyId: string, actorId: string, body: Record<string, unknown>) {
    return this.locations.upsertLocation(companyId, actorId, body);
  }

  deleteLocation(companyId: string, actorId: string, id: string) {
    return this.locations.deleteLocation(companyId, actorId, id);
  }

  // ── Departments ─────────────────────────────────────────────────────────

  listDepartments(companyId: string) {
    return this.departments.listDepartments(companyId);
  }

  upsertDepartment(companyId: string, actorId: string, body: Record<string, unknown>) {
    return this.departments.upsertDepartment(companyId, actorId, body);
  }

  deleteDepartment(companyId: string, actorId: string, id: string) {
    return this.departments.deleteDepartment(companyId, actorId, id);
  }

  // ── Positions ───────────────────────────────────────────────────────────

  listPositions(companyId: string) {
    return this.positions.listPositions(companyId);
  }

  upsertPosition(companyId: string, actorId: string, body: Record<string, unknown>) {
    return this.positions.upsertPosition(companyId, actorId, body);
  }

  deletePosition(companyId: string, actorId: string, id: string) {
    return this.positions.deletePosition(companyId, actorId, id);
  }

  // ── Shifts ──────────────────────────────────────────────────────────────

  listShifts(companyId: string) {
    return this.shifts.listShifts(companyId);
  }

  upsertShift(companyId: string, actorId: string, body: Record<string, unknown>) {
    return this.shifts.upsertShift(companyId, actorId, body);
  }

  deleteShift(companyId: string, actorId: string, id: string) {
    return this.shifts.deleteShift(companyId, actorId, id);
  }

  // ── Approvals ───────────────────────────────────────────────────────────

  listApprovals(companyId: string) {
    return this.approvals.listApprovals(companyId);
  }

  patchApproval(companyId: string, actorId: string, id: string, requiresApproval: boolean) {
    return this.approvals.patchApproval(companyId, actorId, id, requiresApproval);
  }
}
