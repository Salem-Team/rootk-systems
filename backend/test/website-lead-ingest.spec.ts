import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { executeWebsiteLeadIngest } from "../src/crm/website-lead-ingest";

type Lead = {
  id: string;
  companyId: string;
  phone: string;
  websiteSubmissionId: string | null;
};

function store() {
  const leads: Lead[] = [];
  let sequence = 0;
  function deps(companyId: string) {
    return {
      companyId,
      async findBySubmissionId(submissionId: string) {
        return (
          leads.find(
            (lead) =>
              lead.companyId === companyId &&
              lead.websiteSubmissionId === submissionId
          ) ?? null
        );
      },
      async claimOwner() {
        return null;
      },
      async findPhoneOwner(phone: string) {
        const owned = leads.find(
          (lead) => lead.companyId === companyId && lead.phone === phone
        );
        if (!owned) return null;
        return { websiteSubmissionId: owned.websiteSubmissionId };
      },
      async createLead(body: Record<string, unknown>) {
        const submissionId = String(body.websiteSubmissionId);
        const phone = String(body.phone);
        const owned = leads.find(
          (lead) => lead.companyId === companyId && lead.phone === phone
        );
        if (owned && owned.websiteSubmissionId !== submissionId) {
          throw new ConflictException({
            message: "phone",
            code: "PHONE_DUPLICATE",
          });
        }
        const lead = {
          id: `lead_${++sequence}`,
          companyId,
          phone,
          websiteSubmissionId: submissionId,
        };
        leads.push(lead);
        return { id: lead.id, websiteSubmissionId: submissionId };
      },
    };
  }
  return { leads, deps };
}

const submission = "sub_1730000000000_ab12cd";

describe("website lead ingest contract", () => {
  it("replays the same company and submission id without a second lead", async () => {
    const world = store();
    const first = await executeWebsiteLeadIngest(world.deps("cmp_rootk_001"), {
      name: "Ahmed",
      phone: "01012345678",
      submissionId: submission,
    });
    const second = await executeWebsiteLeadIngest(world.deps("cmp_rootk_001"), {
      name: "Someone Else",
      phone: "01012345678",
      submissionId: submission,
    });

    assert.equal(first.kind, "created");
    assert.equal(second.kind, "replay");
    assert.equal(second.submissionId, submission);
    assert.equal(world.leads.length, 1);
    assert.equal(world.leads[0].websiteSubmissionId, submission);
  });

  it("leaves a historical null submission id unverifiable and unchanged", async () => {
    const world = store();
    world.leads.push({
      id: "lead_historical",
      companyId: "cmp_rootk_001",
      phone: "01012345678",
      websiteSubmissionId: null,
    });

    await assert.rejects(
      () =>
        executeWebsiteLeadIngest(world.deps("cmp_rootk_001"), {
          name: "Ahmed",
          phone: "01012345678",
          submissionId: submission,
        }),
      (error: unknown) => {
        assert.ok(error instanceof ConflictException);
        const body = error.getResponse() as {
          code?: string;
          details?: { accepted?: boolean; verifiable?: boolean; submissionId?: string };
        };
        assert.equal(body.code, "LEGACY_MATCH_UNVERIFIABLE");
        assert.equal(body.details?.accepted, false);
        assert.equal(body.details?.verifiable, false);
        assert.equal(body.details?.submissionId, submission);
        assert.equal("id" in (body.details ?? {}), false);
        return true;
      }
    );
    assert.equal(world.leads.length, 1);
    assert.equal(world.leads[0].id, "lead_historical");
    assert.equal(world.leads[0].websiteSubmissionId, null);
  });

  it("reports a phone owned by a different stored submission as a real conflict", async () => {
    const world = store();
    world.leads.push({
      id: "lead_other",
      companyId: "cmp_rootk_001",
      phone: "01012345678",
      websiteSubmissionId: "sub_1730000000001_zzzzzz",
    });

    await assert.rejects(
      () =>
        executeWebsiteLeadIngest(world.deps("cmp_rootk_001"), {
          name: "Ahmed",
          phone: "01012345678",
          submissionId: submission,
        }),
      (error: unknown) => {
        assert.ok(error instanceof ConflictException);
        const body = error.getResponse() as { code?: string };
        assert.equal(body.code, "PHONE_OWNED_BY_OTHER_SUBMISSION");
        return true;
      }
    );
    assert.equal(world.leads.length, 1);
    assert.equal(world.leads[0].websiteSubmissionId, "sub_1730000000001_zzzzzz");
  });

  it("returns the stored lead when the insert loses a unique-key race", async () => {
    const world = store();
    let visible = false;
    const deps = world.deps("cmp_rootk_001");
    deps.findBySubmissionId = async (submissionId) => {
      if (!visible) return null;
      return (
        world.leads.find((lead) => lead.websiteSubmissionId === submissionId) ??
        null
      );
    };
    deps.createLead = async () => {
      world.leads.push({
        id: "lead_winner",
        companyId: "cmp_rootk_001",
        phone: "01012345678",
        websiteSubmissionId: submission,
      });
      visible = true;
      throw Object.assign(new Error("unique"), { code: "P2002" });
    };

    const result = await executeWebsiteLeadIngest(deps, {
      name: "Ahmed",
      phone: "01012345678",
      submissionId: submission,
    });

    assert.equal(result.kind, "replay");
    assert.equal(world.leads.length, 1);
    assert.equal(world.leads[0].id, "lead_winner");
  });

  it("keeps the same phone in two companies as two leads", async () => {
    const world = store();
    const first = await executeWebsiteLeadIngest(world.deps("cmp_rootk_001"), {
      name: "Ahmed",
      phone: "01012345678",
      submissionId: submission,
    });
    const second = await executeWebsiteLeadIngest(world.deps("cmp_other"), {
      name: "Ahmed",
      phone: "01012345678",
      submissionId: submission,
    });

    assert.equal(first.kind, "created");
    assert.equal(second.kind, "created");
    assert.equal(world.leads.length, 2);
    const replay = await executeWebsiteLeadIngest(world.deps("cmp_rootk_001"), {
      name: "Ahmed",
      phone: "01012345678",
      submissionId: submission,
    });
    assert.equal(replay.kind, "replay");
    assert.equal(world.leads.length, 2);
    assert.notEqual(
      (replay as { lead: { id?: string } }).lead.id,
      world.leads.find((lead) => lead.companyId === "cmp_other")?.id
    );
  });

  it("rejects a body companyId that does not match the integration company", async () => {
    const world = store();
    await assert.rejects(
      () =>
        executeWebsiteLeadIngest(world.deps("cmp_rootk_001"), {
          name: "Ahmed",
          phone: "01012345678",
          submissionId: submission,
          companyId: "cmp_other",
        }),
      BadRequestException
    );
    assert.equal(world.leads.length, 0);
  });

  it("rejects a missing submission id instead of creating an unkeyed lead", async () => {
    const world = store();
    await assert.rejects(
      () =>
        executeWebsiteLeadIngest(world.deps("cmp_rootk_001"), {
          name: "Ahmed",
          phone: "01012345678",
        }),
      BadRequestException
    );
    assert.equal(world.leads.length, 0);
  });
});
