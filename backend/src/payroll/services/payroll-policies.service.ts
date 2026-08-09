import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_PAYROLL_POLICY,
  DEFAULT_PAYROLL_RULES,
  mergePolicy,
  policyJson,
} from "../../lib/payroll-defaults";
import type { PolicyPayload } from "../payroll.types";
import type { PayrollRule } from "../../lib/payroll-engine-types";

type LateTier = { afterMinutes: number; dayFraction: number };

/** Payroll policy document + rule-engine configuration (admin settings). */
@Injectable()
export class PayrollPoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  private async policyDoc(companyId: string) {
    let doc = await this.prisma.payrollPoliciesDoc.findUnique({
      where: { companyId },
    });
    if (!doc) {
      doc = await this.prisma.payrollPoliciesDoc.create({
        data: { companyId, payload: policyJson() },
      });
    }
    return doc;
  }

  private async ensureRules(companyId: string) {
    const count = await this.prisma.payrollRule.count({ where: { companyId } });
    if (count > 0) return;
    for (const rule of DEFAULT_PAYROLL_RULES) {
      await this.prisma.payrollRule.create({
        data: {
          companyId,
          code: rule.code,
          labelKey: rule.name,
          enabled: rule.enabled,
          payload: {
            name: rule.name,
            priority: rule.priority,
            when: rule.when,
            then: rule.then,
            description: rule.description,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  /** Raw merged policy payload (defaults + overrides), for internal engine use. */
  async getMergedPolicy(companyId: string): Promise<PolicyPayload> {
    const doc = await this.policyDoc(companyId);
    return mergePolicy(doc.payload as Record<string, unknown>);
  }

  async policies(companyId: string) {
    const doc = await this.policyDoc(companyId);
    const payload = mergePolicy(doc.payload as Record<string, unknown>);
    return {
      id: doc.id,
      companyId,
      ...payload,
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      createdBy: "system",
      updatedBy: "system",
      deletedAt: null,
      isArchived: false,
      metadata: {},
    };
  }

  async patchPolicies(companyId: string, body: Record<string, unknown>) {
    const current = await this.policies(companyId);
    const {
      id: _id,
      companyId: _cid,
      version: _ver,
      createdAt: _ca,
      updatedAt: _ua,
      createdBy: _cb,
      updatedBy: _ub,
      deletedAt: _da,
      isArchived: _ia,
      metadata: _md,
      ...rest
    } = current as Record<string, unknown>;
    void _id;
    void _cid;
    void _ver;
    void _ca;
    void _ua;
    void _cb;
    void _ub;
    void _da;
    void _ia;
    void _md;
    const merged = mergePolicy({ ...rest, ...body } as Record<string, unknown>);
    if (
      body.late &&
      typeof body.late === "object" &&
      rest.late &&
      typeof rest.late === "object"
    ) {
      const prevLate = rest.late as {
        graceMinutes?: number;
        tiers?: LateTier[];
      };
      const nextLate = body.late as {
        graceMinutes?: number;
        tiers?: LateTier[];
      };
      merged.late = {
        graceMinutes:
          nextLate.graceMinutes ??
          prevLate.graceMinutes ??
          DEFAULT_PAYROLL_POLICY.late.graceMinutes,
        tiers: nextLate.tiers ?? prevLate.tiers ?? DEFAULT_PAYROLL_POLICY.late.tiers,
      };
    }
    await this.prisma.payrollPoliciesDoc.update({
      where: { companyId },
      data: {
        payload: merged as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    return this.policies(companyId);
  }

  async rules(companyId: string) {
    await this.ensureRules(companyId);
    const rows = await this.prisma.payrollRule.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
    });
    return rows
      .map((r) => {
        const payload = (r.payload ?? {}) as Record<string, unknown>;
        return {
          id: r.id,
          companyId,
          name: (payload.name as string) ?? r.labelKey,
          enabled: r.enabled,
          priority: (payload.priority as number) ?? 100,
          when: payload.when ?? {
            field: "late_minutes",
            operator: "gt",
            value: 0,
          },
          then: payload.then ?? {
            action: "deduct_day_fraction",
            amount: 0,
          },
          description: (payload.description as string) ?? "",
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          createdBy: "system",
          updatedBy: "system",
          deletedAt: null,
          isArchived: false,
          version: r.version,
          metadata: { code: r.code },
        };
      })
      .sort(
        (a, b) => (a.priority as number) - (b.priority as number)
      );
  }

  async toggleRule(companyId: string, id: string, enabled: boolean) {
    await this.prisma.payrollRule.updateMany({
      where: { id, companyId },
      data: { enabled },
    });
    return this.rules(companyId);
  }

  /** Engine-shaped rules for payslip calculation. */
  async loadEngineRules(companyId: string): Promise<PayrollRule[]> {
    await this.ensureRules(companyId);
    const rows = await this.prisma.payrollRule.findMany({ where: { companyId } });
    return rows.map((row, index) => {
      const p = (row.payload ?? {}) as Record<string, unknown>;
      const when = (p.when ?? {}) as Record<string, unknown>;
      const then = (p.then ?? {}) as Record<string, unknown>;
      const now = new Date().toISOString();
      return {
        id: row.id,
        name: String(p.name ?? row.labelKey ?? row.code),
        enabled: row.enabled,
        priority: Number(p.priority ?? (index + 1) * 10),
        when: {
          field: String(when.field ?? "late_minutes") as PayrollRule["when"]["field"],
          operator: String(when.operator ?? "gt") as PayrollRule["when"]["operator"],
          value: Number(when.value ?? 0),
        },
        then: {
          action: String(then.action ?? "deduct_fixed") as PayrollRule["then"]["action"],
          amount: Number(then.amount ?? 0),
        },
        description: String(p.description ?? ""),
        companyId,
        createdAt: row.createdAt?.toISOString?.() ?? now,
        updatedAt: row.updatedAt?.toISOString?.() ?? now,
        createdBy: "system",
        updatedBy: "system",
        deletedAt: null,
        isArchived: false,
        version: row.version,
        metadata: {},
      };
    });
  }
}
