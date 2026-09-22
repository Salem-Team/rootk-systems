/**
 * CRM owner scoping — each sales user only sees assigned leads.
 * Run: npx tsx scripts/verify-crm-scope.ts
 */

import { canCrm } from "../src/lib/crm-policies";
import { buildCrmDashboard } from "../src/lib/crm/dashboard";
import {
  canFilterCrmByOwner,
  filterLeads,
  isLeadOwnedByActor,
} from "../src/lib/crm/lead-filters";
import {
  buildSalesProfile,
  filterSalesProfileLeads,
  mergeOwnedProfileLeads,
  ownedSalesProfileLeads,
  toSalesProfileLeads,
} from "../src/lib/crm/sales-profile";
import type { Employee } from "../src/types";
import type {
  CrmFeedbackType,
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmSalesProfileLead,
  CrmStage,
} from "../src/types/crm";

let failed = 0;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

const NOW = "2026-08-11T10:00:00.000Z";

function entity() {
  return {
    companyId: "c1",
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: "sys",
    updatedBy: "sys",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}

function lead(
  id: string,
  ownerEmployeeId: string | null,
  extras: Partial<CrmLead> = {}
): CrmLead {
  return {
    id,
    name: id,
    phone: "01000000000",
    email: `${id}@ex.com`,
    companyName: "Co",
    businessTypeId: null,
    source: "other",
    ownerEmployeeId,
    stageId: extras.stageId ?? "st-new",
    subStageId: null,
    status: extras.status ?? "active",
    tags: [],
    nextAction: extras.nextAction ?? "none",
    nextFollowUpAt: extras.nextFollowUpAt ?? null,
    lastActivityAt: extras.lastActivityAt ?? NOW,
    lossReasonTypeId: null,
    request: "",
    budget: "",
    notes: "",
    convertedAt: extras.convertedAt ?? null,
    ...entity(),
    ...extras,
  };
}

function stage(
  id: string,
  name: string,
  category: CrmStage["category"],
  sortOrder: number
): CrmStage {
  return {
    id,
    name,
    description: "",
    color: "#94a3b8",
    sortOrder,
    active: true,
    conversionProbability: null,
    category,
    ...entity(),
  };
}

function salesEmp(id: string, name: string): Employee {
  return {
    id,
    employeeId: id,
    name,
    email: `${id}@rootk.systems`,
    phone: "",
    department: "Sales",
    position: "Sales",
    status: "active",
    joinDate: "2026-01-01",
    location: "Cairo",
    managerEmployeeIds: [],
    companyId: "c1",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}

const stages = [
  stage("st-new", "New", "open", 1),
  stage("st-won", "Won", "won", 2),
  stage("st-lost", "Lost", "lost", 3),
];

const hagar = "emp-hagar";
const salem = "emp-salem";

const leads: CrmLead[] = [
  lead("l-h1", hagar),
  lead("l-h2", hagar, { stageId: "st-won", status: "inactive", convertedAt: NOW }),
  lead("l-s1", salem),
  lead("l-none", null),
];

const employees = [salesEmp(hagar, "Hagar"), salesEmp(salem, "Salem")];
const feedbackTypes: CrmFeedbackType[] = [];
const feedback: CrmLeadFeedback[] = [];

function main() {
  assert(
    isLeadOwnedByActor(hagar, { canViewOthers: true }),
    "view-others owns any lead"
  );
  assert(
    isLeadOwnedByActor(hagar, { canViewOthers: false, actorEmployeeId: hagar }),
    "sales owns assigned lead"
  );
  assert(
    !isLeadOwnedByActor(salem, { actorEmployeeId: hagar }),
    "sales does not own teammate lead"
  );
  assert(
    !isLeadOwnedByActor(hagar, { actorEmployeeId: "" }),
    "missing actor id is fail-closed"
  );
  assert(
    !isLeadOwnedByActor(null, { actorEmployeeId: hagar }),
    "sales does not see unassigned leads"
  );

  const hagarLeads = filterLeads(leads, {}, {
    actorEmployeeId: hagar,
  });
  assert(
    hagarLeads.length === 2 && hagarLeads.every((l) => l.ownerEmployeeId === hagar),
    "filterLeads: sales sees only assigned leads"
  );

  const emptyActor = filterLeads(leads, {}, {
    actorEmployeeId: "",
  });
  assert(emptyActor.length === 0, "filterLeads: empty actor sees nothing");

  const missingOpts = filterLeads(leads, {});
  assert(missingOpts.length === 0, "filterLeads: omitted opts is fail-closed");

  const othersAll = filterLeads(leads, {}, { canViewOthers: true });
  assert(othersAll.length === 4, "filterLeads: view-others sees all including unassigned");

  // Cold calls share the table but stay out of lead totals by default.
  const typedRows: CrmLead[] = [
    lead("lead-a", hagar, { recordType: "lead" }),
    lead("cold-a", hagar, { recordType: "cold_call" }),
    lead("legacy-a", hagar), // missing recordType → treated as lead
  ];
  const defaultLeadsOnly = filterLeads(typedRows, {}, { canViewOthers: true });
  assert(
    defaultLeadsOnly.length === 2 &&
      defaultLeadsOnly.every((l) => (l.recordType ?? "lead") === "lead"),
    "filterLeads: default excludes cold_call rows"
  );
  const coldOnly = filterLeads(
    typedRows,
    { recordType: "cold_call" },
    { canViewOthers: true }
  );
  assert(
    coldOnly.length === 1 && coldOnly[0]?.id === "cold-a",
    "filterLeads: recordType=cold_call is isolated"
  );
  assert(
    filterLeads(typedRows, { recordType: "lead" }, { canViewOthers: true }).every(
      (l) => l.id !== "cold-a"
    ),
    "filterLeads: recordType=lead never includes cold_call"
  );

  const dashWithCold = buildCrmDashboard(
    [...leads, lead("cold-kpi", hagar, { recordType: "cold_call" })],
    stages,
    feedbackTypes,
    feedback,
    employees,
    { range: "all" },
    { canViewOthers: true }
  );
  assert(
    dashWithCold.kpis.totalLeads === 4,
    "dashboard: cold_call rows excluded from KPI totals"
  );

  const teamLeads = filterLeads(leads, {}, {
    actorEmployeeId: hagar,
    teamOwnerIds: [hagar, salem],
  });
  assert(
    teamLeads.length === 3 &&
      teamLeads.every((l) => l.ownerEmployeeId === hagar || l.ownerEmployeeId === salem),
    "filterLeads: team sees own plus direct reports"
  );
  assert(
    canFilterCrmByOwner({ canViewTeam: true }) &&
      !canFilterCrmByOwner({ canViewOthers: false, canViewTeam: false, canAssign: false }),
    "owner filter is available for team managers"
  );
  assert(
    isLeadOwnedByActor(salem, { actorEmployeeId: hagar, teamOwnerIds: [hagar, salem] }),
    "manager owns direct-report lead in team scope"
  );

  const othersHagar = filterLeads(
    leads,
    { ownerEmployeeId: hagar },
    { canViewOthers: true }
  );
  assert(
    othersHagar.length === 2 && othersHagar.every((l) => l.ownerEmployeeId === hagar),
    "filterLeads: view-others owner filter"
  );

  const peek = filterLeads(
    leads,
    { ownerEmployeeId: salem },
    { actorEmployeeId: hagar }
  );
  assert(
    peek.length === 2 && peek.every((l) => l.ownerEmployeeId === hagar),
    "filterLeads: sales cannot peek via owner filter"
  );

  const dashTeam = buildCrmDashboard(
    leads,
    stages,
    feedbackTypes,
    feedback,
    employees,
    { range: "all" },
    { actorEmployeeId: hagar, teamOwnerIds: [hagar, salem] }
  );
  assert(
    dashTeam.kpis.totalLeads === 3,
    "dashboard: team KPI includes direct reports not the rest of the company"
  );

  const dashHagar = buildCrmDashboard(
    leads,
    stages,
    feedbackTypes,
    feedback,
    employees,
    { range: "all" },
    { actorEmployeeId: hagar }
  );
  assert(dashHagar.kpis.totalLeads === 2, "dashboard: sales KPI is assigned only");
  assert(
    dashHagar.salesPerformance.length === 1 &&
      dashHagar.salesPerformance[0]?.employeeId === hagar,
    "dashboard: sales roster is self only"
  );
  assert(
    dashHagar.salesPerformance[0]?.leads === 2,
    "dashboard: sales row counts own leads"
  );

  const dashEmpty = buildCrmDashboard(
    leads,
    stages,
    feedbackTypes,
    feedback,
    employees,
    { range: "all" },
    { actorEmployeeId: "" }
  );
  assert(dashEmpty.kpis.totalLeads === 0, "dashboard: missing actor is empty");
  assert(
    dashEmpty.salesPerformance.length === 0,
    "dashboard: missing actor has no sales rows"
  );

  const dashAdmin = buildCrmDashboard(
    leads,
    stages,
    feedbackTypes,
    feedback,
    employees,
    { range: "all" },
    { canViewOthers: true }
  );
  assert(dashAdmin.kpis.totalLeads === 4, "dashboard: view-others sees all");
  assert(
    dashAdmin.salesPerformance.some((r) => r.employeeId === hagar) &&
      dashAdmin.salesPerformance.some((r) => r.employeeId === salem),
    "dashboard: admin lists both sales"
  );

  const dashAdminFilter = buildCrmDashboard(
    leads,
    stages,
    feedbackTypes,
    feedback,
    employees,
    { range: "all", ownerEmployeeId: salem },
    { canViewOthers: true }
  );
  assert(
    dashAdminFilter.kpis.totalLeads === 1,
    "dashboard: admin owner filter counts one"
  );

  const dashPeek = buildCrmDashboard(
    leads,
    stages,
    feedbackTypes,
    feedback,
    employees,
    { range: "all", ownerEmployeeId: salem },
    { actorEmployeeId: hagar }
  );
  assert(
    dashPeek.kpis.totalLeads === 0,
    "dashboard: sales owner query cannot peek teammate"
  );

  const activities: CrmLeadActivity[] = [];
  const profile = buildSalesProfile(
    hagar,
    "Hagar",
    leads,
    stages,
    activities,
    feedback
  );
  assert(profile.overview.totalLeads === 2, "profile: total is assigned only");
  assert(profile.overview.won === 1, "profile: won is assigned only");
  assert(
    profile.leads.length === 2 &&
      profile.leads.every((l) => l.ownerEmployeeId === hagar),
    "profile: lead list is assigned only"
  );

  const mixed: CrmSalesProfileLead[] = [
    ...toSalesProfileLeads([leads[0]!, leads[2]!], stages),
  ];
  const owned = ownedSalesProfileLeads(mixed, hagar);
  assert(
    owned.length === 1 && owned[0]?.id === "l-h1",
    "ownedSalesProfileLeads drops other owners"
  );

  const mergedFromProfile = mergeOwnedProfileLeads(
    {
      ...profile,
      leads: toSalesProfileLeads([leads[0]!], stages),
    },
    [leads[2]!],
    stages
  );
  assert(
    mergedFromProfile.leads.length === 1 &&
      mergedFromProfile.leads[0]?.id === "l-h1",
    "merge prefers profile owned leads"
  );

  const mergedFallback = mergeOwnedProfileLeads(
    { ...profile, leads: [] },
    [leads[0]!, leads[2]!],
    stages
  );
  assert(
    mergedFallback.leads.length === 1 && mergedFallback.leads[0]?.id === "l-h1",
    "merge falls back to owned fetched leads"
  );

  const pending = filterSalesProfileLeads(
    toSalesProfileLeads(
      [lead("l-fu", hagar, { nextFollowUpAt: NOW, nextAction: "call" })],
      stages
    ),
    "pendingFollowUps"
  );
  assert(pending.length === 1, "filterSalesProfileLeads pending follow-ups");

  assert(
    canFilterCrmByOwner({ canViewOthers: true }) &&
      canFilterCrmByOwner({ canAssign: true }) &&
      !canFilterCrmByOwner({}),
    "owner filter follows view-others or assign, not role"
  );
  assert(canCrm("admin", "assign"), "admin can assign");
  assert(!canCrm("employee", "assign"), "sales cannot assign");
  assert(!canCrm("employee", "view_performance"), "sales cannot view all performance");
  assert(canCrm("employee", "view"), "sales can view own CRM");
  assert(canCrm("employee", "view_dashboard"), "sales can view own dashboard");

  const searchable = lead("l-search", hagar, {
    name: "أحمد علي",
    phone: "01012345678",
    phoneNormalized: "+201012345678",
    budget: "أقل من 50 ألف",
    request: "المنتج: إدارة العملاء",
    notes: "محتاج عرض",
    source: "facebook",
    tags: ["hot"],
  });
  const searchScope = { canViewOthers: true as const };
  const found = (q: string, extra = "") =>
    filterLeads([searchable], { search: q }, {
      ...searchScope,
      searchTextByLeadId: extra
        ? new Map([[searchable.id, extra]])
        : undefined,
    }).length === 1;
  assert(found("احمد"), "search: folded Arabic name");
  assert(found("01012345678"), "search: local mobile");
  assert(found("201012345678"), "search: international digits");
  assert(found("1234"), "search: phone fragment");
  assert(found("<50k"), "search: compact budget");
  assert(found("أقل من 50"), "search: budget text");
  assert(found("crm"), "search: request product");
  assert(found("فيسبوك"), "search: source label");
  assert(found("ساخن"), "search: tag label");
  assert(found("محتاج"), "search: notes");
  assert(
    found("الميزانية عالية", "فيدباك: الميزانية عالية ومحتاج خصم"),
    "search: feedback text"
  );
  assert(!found("عميل مش موجود"), "search: unrelated query misses");

  if (failed > 0) {
    console.error(`\nCRM scope verify failed: ${failed} assertion(s)`);
    process.exit(1);
  }
  console.log("\nCRM scope verify passed.");
}

main();
