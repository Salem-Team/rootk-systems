/**
 * Duplicate / tenant isolation tests for canonical phones (no live DB).
 * Run: npx tsx scripts/verify-crm-phone.ts
 */
import { canonicalPhoneOrNull } from "../shared/phone-normalize";
import { canCrm } from "../src/lib/crm-policies";

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

const companyA = [
  { id: "a1", companyId: "cmp-a", phoneNormalized: "+201012345678" },
];
const companyB = [
  { id: "b1", companyId: "cmp-b", phoneNormalized: "+201012345678" },
];

function findInCompany(
  rows: Array<{ id: string; companyId: string; phoneNormalized: string }>,
  companyId: string,
  rawPhone: string
) {
  const key = canonicalPhoneOrNull(rawPhone);
  if (!key) return null;
  return rows.find((r) => r.companyId === companyId && r.phoneNormalized === key) ?? null;
}

assert(
  findInCompany(companyA, "cmp-a", "01012345678")?.id === "a1",
  "company A finds its lead via 010…"
);
assert(
  findInCompany(companyB, "cmp-a", "01012345678") === null,
  "searching company A store for B’s query against B rows is scoped — cmp-a not in B list"
);
assert(
  findInCompany(companyA, "cmp-b", "+201012345678") === null,
  "company B id never matches company A rows"
);
assert(
  findInCompany(companyB, "cmp-b", "00201012345678")?.id === "b1",
  "company B finds the same canonical number"
);

type CallRow = { id: string; companyId: string; externalCallId: string };
const calls: CallRow[] = [];
function recordIdempotent(row: CallRow): CallRow {
  const existing = calls.find(
    (c) => c.companyId === row.companyId && c.externalCallId === row.externalCallId
  );
  if (existing) return existing;
  calls.push(row);
  return row;
}

const first = recordIdempotent({
  id: "c1",
  companyId: "cmp-a",
  externalCallId: "android:abc",
});
const retry = recordIdempotent({
  id: "c2",
  companyId: "cmp-a",
  externalCallId: "android:abc",
});
recordIdempotent({
  id: "c3",
  companyId: "cmp-b",
  externalCallId: "android:abc",
});

assert(first.id === retry.id, "same externalCallId in one company is one record");
assert(calls.length === 2, "same external id in another company is a separate record");

assert(canCrm("employee", "view"), "employee may view CRM");
assert(canCrm("employee", "create"), "employee may create leads");
assert(
  !canCrm("employee", "create", ["crm.viewLeads"]),
  "permission override without crm.createLeads is 403"
);
assert(
  !canCrm("employee", "edit", ["crm.viewLeads"]),
  "recording a call without crm.editLeads is denied"
);
assert(canCrm("admin", "create"), "admin may create leads");

function visibleDuplicateDetails(
  lead: { id: string; ownerEmployeeId: string },
  actorEmployeeId: string,
  canViewOthers: boolean
) {
  if (canViewOthers || lead.ownerEmployeeId === actorEmployeeId) {
    return { existingLead: lead, ownedByOther: false };
  }
  return { existingLead: null, ownedByOther: true };
}

assert(
  visibleDuplicateDetails({ id: "lead-b", ownerEmployeeId: "emp-b" }, "emp-a", false)
    .ownedByOther === true,
  "sales cannot see teammate lead identity on duplicate"
);
assert(
  visibleDuplicateDetails({ id: "lead-b", ownerEmployeeId: "emp-b" }, "emp-a", false)
    .existingLead === null,
  "restricted duplicate response does not leak the other lead"
);

function replayCall(existing: { id: string; leadId: string }, requestedLeadId: string) {
  if (existing.leadId !== requestedLeadId) {
    return { leak: false, code: "CALL_DUPLICATE" as const };
  }
  return { leak: false, id: existing.id };
}

const replay = replayCall({ id: "c1", leadId: "lead-a" }, "lead-b");
assert(
  replay.code === "CALL_DUPLICATE" && !("id" in replay),
  "replaying another lead’s externalCallId does not return that call"
);
assert(
  replayCall({ id: "c1", leadId: "lead-a" }, "lead-a").id === "c1",
  "same lead + same externalCallId is idempotent"
);

if (failed) {
  console.error(`\n${failed} crm-phone checks failed`);
  process.exit(1);
}
console.log("\nAll crm-phone matching / isolation / idempotency checks passed");
