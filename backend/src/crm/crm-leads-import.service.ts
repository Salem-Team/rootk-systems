import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, isAdmin, type Actor } from "./crm-access";
import { CRM_IMPORT_MAX_ROWS } from "./crm-defaults";
import { CrmLeadCreateService } from "./crm-lead-create.service";
import { CrmSharedService } from "./crm-shared.service";

export type CrmImportRowResult = {
  row: number;
  ok: boolean;
  id?: string;
  message?: string;
};

@Injectable()
export class CrmLeadsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService,
    private readonly createService: CrmLeadCreateService
  ) {}

  async importLeads(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "create");
    await this.shared.ensureDefaultStages(companyId);

    const rows = Array.isArray(body.rows) ? body.rows : null;
    if (!rows || rows.length === 0) {
      throw new BadRequestException("rows array is required");
    }
    if (rows.length > CRM_IMPORT_MAX_ROWS) {
      throw new BadRequestException(
        `Too many rows (max ${CRM_IMPORT_MAX_ROWS})`
      );
    }

    await this.shared.ensureDefaultBusinessTypes(companyId);
    const [stages, employees, businessTypes] = await Promise.all([
      this.prisma.crmStage.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true, active: true },
      }),
      this.prisma.employee.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.crmBusinessType.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true },
      }),
    ]);
    const businessTypeByKey = new Map<string, string>();
    for (const b of businessTypes) {
      businessTypeByKey.set(b.id, b.id);
      businessTypeByKey.set(b.name.trim().toLowerCase(), b.id);
    }

    const stageByKey = new Map<string, string>();
    for (const s of stages) {
      stageByKey.set(s.id, s.id);
      stageByKey.set(s.name.trim().toLowerCase(), s.id);
    }
    const defaultStageId =
      stages.find((s) => s.active)?.id ?? stages[0]?.id ?? "";
    if (!defaultStageId) {
      throw new BadRequestException("No CRM stages configured");
    }

    const ownerByKey = new Map<string, string>();
    for (const e of employees) {
      ownerByKey.set(e.id, e.id);
      ownerByKey.set(e.name.trim().toLowerCase(), e.id);
      if (e.email) ownerByKey.set(e.email.trim().toLowerCase(), e.id);
    }

    const results: CrmImportRowResult[] = [];
    let created = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const raw = rows[i];
      const rowNum = i + 1;
      if (!raw || typeof raw !== "object") {
        failed += 1;
        results.push({ row: rowNum, ok: false, message: "Invalid row" });
        continue;
      }
      const item = raw as Record<string, unknown>;
      try {
        const stageRaw = String(item.stageId ?? item.stage ?? "").trim();
        const stageId =
          (stageRaw
            ? stageByKey.get(stageRaw) ||
              stageByKey.get(stageRaw.toLowerCase())
            : null) ?? defaultStageId;

        let ownerEmployeeId: string | null = null;
        const ownerRaw = String(
          item.ownerEmployeeId ?? item.owner ?? ""
        ).trim();
        if (ownerRaw) {
          ownerEmployeeId =
            ownerByKey.get(ownerRaw) ||
            ownerByKey.get(ownerRaw.toLowerCase()) ||
            null;
        }
        if (!isAdmin(actor)) {
          ownerEmployeeId = actor.employeeId;
        }

        const tags = Array.isArray(item.tags)
          ? item.tags
          : typeof item.tags === "string"
            ? String(item.tags)
                .split(/[|;,]/)
                .map((t) => t.trim())
                .filter(Boolean)
            : [];

        const btRaw = String(
          item.businessTypeId ?? item.businessType ?? ""
        ).trim();
        const businessTypeId = btRaw
          ? businessTypeByKey.get(btRaw) ||
            businessTypeByKey.get(btRaw.toLowerCase()) ||
            null
          : null;

        const lead = await this.createService.createLead(companyId, actor, {
          name: item.name,
          phone: item.phone,
          email: item.email,
          companyName: item.companyName,
          businessTypeId,
          source: item.source,
          stageId,
          ownerEmployeeId,
          status: item.status,
          tags,
          nextAction: item.nextAction,
          notes: item.notes,
        });
        created += 1;
        results.push({ row: rowNum, ok: true, id: lead.id });
      } catch (error) {
        failed += 1;
        const message =
          error instanceof Error ? error.message : "Failed to create lead";
        results.push({ row: rowNum, ok: false, message });
      }
    }

    return { created, failed, total: rows.length, results };
  }

  async exportLeads(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    assertCap(actor, "view");
    const list = await this.prisma.crmLead.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(isAdmin(actor)
          ? {}
          : { ownerEmployeeId: actor.employeeId }),
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.stageId ? { stageId: query.stageId } : {}),
        ...(query.source ? { source: query.source as never } : {}),
        ...(query.ownerEmployeeId && isAdmin(actor)
          ? { ownerEmployeeId: query.ownerEmployeeId }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: CRM_IMPORT_MAX_ROWS,
    });

    const [stages, employees, businessTypes] = await Promise.all([
      this.prisma.crmStage.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.employee.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.crmBusinessType.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true },
      }),
    ]);
    const stageName = new Map(stages.map((s) => [s.id, s.name]));
    const ownerName = new Map(employees.map((e) => [e.id, e.name]));
    const businessName = new Map(businessTypes.map((b) => [b.id, b.name]));

    return list.map((lead) => ({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      companyName: lead.companyName,
      businessType: lead.businessTypeId
        ? businessName.get(lead.businessTypeId) ?? lead.businessTypeId
        : "",
      source: lead.source,
      stage: stageName.get(lead.stageId) ?? lead.stageId,
      owner: lead.ownerEmployeeId
        ? ownerName.get(lead.ownerEmployeeId) ?? lead.ownerEmployeeId
        : "",
      status: lead.status,
      tags: lead.tags.join(";"),
      nextAction: lead.nextAction,
      notes: lead.notes,
    }));
  }
}
