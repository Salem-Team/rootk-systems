import {
  CrmActivityType,
  CrmLeadSource,
  CrmLeadStatus,
  CrmNextAction,
  CrmStageCategory,
  type PrismaClient,
} from "@prisma/client";
import { canonicalPhoneOrNull } from "../lib/phone-normalize";

type Db = PrismaClient;

const HOURS = 3_600_000;
const DAYS = 24 * HOURS;

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * HOURS);
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * DAYS);
}

/** Stable demo owner mapping onto API-seeded employees. */
const OWNERS = {
  dina: "emp_002", // Amira Hassan — Sales-facing
  omar: "emp_003", // Karim Farouk
  salem: "emp_001", // Salem Employee
} as const;

const DEFAULT_STAGES: Array<{
  name: string;
  key: string;
  description: string;
  color: string;
  sortOrder: number;
  conversionProbability: number;
  category: CrmStageCategory;
}> = [
  {
    name: "New Lead",
    key: "new",
    description: "Fresh inbound lead",
    color: "#64748b",
    sortOrder: 0,
    conversionProbability: 10,
    category: CrmStageCategory.open,
  },
  {
    name: "Contacted",
    key: "contacted",
    description: "First contact made",
    color: "#0ea5e9",
    sortOrder: 1,
    conversionProbability: 20,
    category: CrmStageCategory.open,
  },
  {
    name: "Qualified",
    key: "qualified",
    description: "Needs confirmed",
    color: "#8b5cf6",
    sortOrder: 2,
    conversionProbability: 40,
    category: CrmStageCategory.open,
  },
  {
    name: "Interested",
    key: "interested",
    description: "Showing buying intent",
    color: "#06b6d4",
    sortOrder: 3,
    conversionProbability: 55,
    category: CrmStageCategory.open,
  },
  {
    name: "Meeting",
    key: "meeting",
    description: "Meeting scheduled or held",
    color: "#f59e0b",
    sortOrder: 4,
    conversionProbability: 65,
    category: CrmStageCategory.open,
  },
  {
    name: "Proposal",
    key: "proposal",
    description: "Proposal sent",
    color: "#f97316",
    sortOrder: 5,
    conversionProbability: 75,
    category: CrmStageCategory.open,
  },
  {
    name: "Negotiation",
    key: "negotiation",
    description: "In negotiation",
    color: "#eab308",
    sortOrder: 6,
    conversionProbability: 85,
    category: CrmStageCategory.open,
  },
  {
    name: "Won",
    key: "won",
    description: "Converted",
    color: "#22c55e",
    sortOrder: 7,
    conversionProbability: 100,
    category: CrmStageCategory.won,
  },
  {
    name: "Lost",
    key: "lost",
    description: "Closed lost",
    color: "#ef4444",
    sortOrder: 8,
    conversionProbability: 0,
    category: CrmStageCategory.lost,
  },
];

const DEFAULT_BUSINESS_TYPES = [
  "تكنولوجيا",
  "رعاية صحية",
  "تعليم",
  "تجارة التجزئة",
  "عقارات",
  "تصنيع",
  "تمويل وخدمات مالية",
  "أغذية ومشروبات",
  "مقاولات وبناء",
  "خدمات لوجستية",
  "تسويق وإعلان",
  "سياحة وفنادق",
  "زراعة",
  "تجارة إلكترونية",
  "خدمات قانونية",
  "طاقة",
  "اتصالات",
  "تجارة الجملة",
  "خدمات مهنية",
  "مطاعم وضيافة",
  "أخرى",
];

const DEFAULT_FEEDBACK_TYPES: Array<{
  name: string;
  isLossReason: boolean;
}> = [
  { name: "Interested", isLossReason: false },
  { name: "Not Interested", isLossReason: true },
  { name: "Price Issue", isLossReason: true },
  { name: "Timing Issue", isLossReason: true },
  { name: "Needs More Information", isLossReason: false },
  { name: "Competitor", isLossReason: true },
  { name: "No Response", isLossReason: true },
  { name: "Wrong Lead", isLossReason: true },
  { name: "Budget Issue", isLossReason: true },
  { name: "Feature Request", isLossReason: false },
  { name: "Other", isLossReason: true },
];

const STAGE_BY_NAME: Record<string, string> = Object.fromEntries(
  DEFAULT_STAGES.map((s) => [s.name, s.key])
);

const SUB_STAGES: Array<{
  id: string;
  stageKey: string;
  name: string;
  description: string;
  sortOrder: number;
}> = [
  {
    id: "crm-sub-new-created",
    stageKey: "new",
    name: "Created",
    description: "Lead just entered the system",
    sortOrder: 0,
  },
  {
    id: "crm-sub-new-review",
    stageKey: "new",
    name: "Under review",
    description: "Waiting for first qualification",
    sortOrder: 1,
  },
  {
    id: "crm-sub-contacted-cold",
    stageKey: "contacted",
    name: "Cold calls",
    description: "Outbound first contact",
    sortOrder: 0,
  },
  {
    id: "crm-sub-contacted-warm",
    stageKey: "contacted",
    name: "Warm reply",
    description: "Lead responded positively",
    sortOrder: 1,
  },
  {
    id: "crm-sub-qualified-needs",
    stageKey: "qualified",
    name: "Needs confirmed",
    description: "Requirements captured",
    sortOrder: 0,
  },
  {
    id: "crm-sub-interested-demo",
    stageKey: "interested",
    name: "Demo scheduled",
    description: "Product demo booked",
    sortOrder: 0,
  },
  {
    id: "crm-sub-meeting-held",
    stageKey: "meeting",
    name: "Meeting held",
    description: "Discovery meeting completed",
    sortOrder: 0,
  },
  {
    id: "crm-sub-proposal-sent",
    stageKey: "proposal",
    name: "Proposal sent",
    description: "Commercial offer delivered",
    sortOrder: 0,
  },
  {
    id: "crm-sub-negotiation-terms",
    stageKey: "negotiation",
    name: "Terms discussion",
    description: "Negotiating commercial terms",
    sortOrder: 0,
  },
  {
    id: "crm-sub-won-closed",
    stageKey: "won",
    name: "Closed won",
    description: "Deal finalized",
    sortOrder: 0,
  },
  {
    id: "crm-sub-lost-budget",
    stageKey: "lost",
    name: "Budget",
    description: "Lost on budget",
    sortOrder: 0,
  },
];

type LeadSeed = {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyName: string;
  businessTypeName: string;
  source: CrmLeadSource;
  ownerEmployeeId: string;
  stageKey: string;
  subStageId: string;
  status: CrmLeadStatus;
  tags: string[];
  nextAction: CrmNextAction;
  nextFollowUpAt: Date | null;
  lastActivityAt: Date | null;
  lossReasonName: string | null;
  notes: string;
  request: string;
  budget: string;
  convertedAt: Date | null;
  createdAt: Date;
};

function buildLeads(): LeadSeed[] {
  return [
    {
      id: "crm-lead-001",
      name: "Ahmed Mohamed",
      phone: "+20 100 555 1001",
      email: "ahmed.m@example.com",
      companyName: "Nile Retail",
      businessTypeName: "تجارة التجزئة",
      source: CrmLeadSource.facebook,
      ownerEmployeeId: OWNERS.dina,
      stageKey: "qualified",
      subStageId: "crm-sub-qualified-needs",
      status: CrmLeadStatus.active,
      tags: ["hot", "interested"],
      nextAction: CrmNextAction.call,
      nextFollowUpAt: hoursFromNow(6),
      lastActivityAt: hoursFromNow(-5),
      lossReasonName: null,
      notes: "Asked about enterprise pricing",
      request: "Enterprise pricing",
      budget: "Under discussion",
      convertedAt: null,
      createdAt: daysAgo(12),
    },
    {
      id: "crm-lead-002",
      name: "Sara Hassan",
      phone: "+20 111 555 1002",
      email: "sara.h@example.com",
      companyName: "Delta Soft",
      businessTypeName: "تكنولوجيا",
      source: CrmLeadSource.website,
      ownerEmployeeId: OWNERS.omar,
      stageKey: "proposal",
      subStageId: "crm-sub-proposal-sent",
      status: CrmLeadStatus.active,
      tags: ["warm", "high_budget"],
      nextAction: CrmNextAction.send_proposal,
      nextFollowUpAt: hoursFromNow(24),
      lastActivityAt: hoursFromNow(-20),
      lossReasonName: null,
      notes: "",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: daysAgo(20),
    },
    {
      id: "crm-lead-003",
      name: "Karim Fathy",
      phone: "+20 122 555 1003",
      email: "",
      companyName: "Cairo Logistics",
      businessTypeName: "تمويل وخدمات مالية",
      source: CrmLeadSource.whatsapp,
      ownerEmployeeId: OWNERS.salem,
      stageKey: "contacted",
      subStageId: "crm-sub-contacted-cold",
      status: CrmLeadStatus.active,
      tags: ["follow_up"],
      nextAction: CrmNextAction.whatsapp,
      nextFollowUpAt: daysAgo(2),
      lastActivityAt: daysAgo(8),
      lossReasonName: null,
      notes: "No answer last two attempts",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: daysAgo(18),
    },
    {
      id: "crm-lead-004",
      name: "Mona Adel",
      phone: "+20 150 555 1004",
      email: "mona@example.com",
      companyName: "Alex Clinics",
      businessTypeName: "رعاية صحية",
      source: CrmLeadSource.referral,
      ownerEmployeeId: OWNERS.dina,
      stageKey: "meeting",
      subStageId: "crm-sub-meeting-held",
      status: CrmLeadStatus.active,
      tags: ["vip"],
      nextAction: CrmNextAction.meeting,
      nextFollowUpAt: hoursFromNow(30),
      lastActivityAt: hoursFromNow(-10),
      lossReasonName: null,
      notes: "",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: daysAgo(9),
    },
    {
      id: "crm-lead-005",
      name: "Yasser Nabil",
      phone: "+20 100 555 1005",
      email: "yasser@example.com",
      companyName: "Giza Foods",
      businessTypeName: "أغذية ومشروبات",
      source: CrmLeadSource.instagram,
      ownerEmployeeId: OWNERS.omar,
      stageKey: "new",
      subStageId: "crm-sub-new-created",
      status: CrmLeadStatus.active,
      tags: ["cold"],
      nextAction: CrmNextAction.none,
      nextFollowUpAt: null,
      lastActivityAt: daysAgo(1),
      lossReasonName: null,
      notes: "",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: daysAgo(1),
    },
    {
      id: "crm-lead-006",
      name: "Huda Samir",
      phone: "+20 101 555 1006",
      email: "huda@example.com",
      companyName: "Smart Home EG",
      businessTypeName: "تعليم",
      source: CrmLeadSource.tiktok,
      ownerEmployeeId: OWNERS.dina,
      stageKey: "won",
      subStageId: "crm-sub-won-closed",
      status: CrmLeadStatus.active,
      tags: ["hot"],
      nextAction: CrmNextAction.none,
      nextFollowUpAt: null,
      lastActivityAt: daysAgo(3),
      lossReasonName: null,
      notes: "Signed annual plan",
      request: "",
      budget: "",
      convertedAt: daysAgo(3),
      createdAt: daysAgo(40),
    },
    {
      id: "crm-lead-007",
      name: "Bassem Lotfy",
      phone: "+20 112 555 1007",
      email: "",
      companyName: "Lotfy Trading",
      businessTypeName: "تصنيع",
      source: CrmLeadSource.advertisement,
      ownerEmployeeId: OWNERS.salem,
      stageKey: "lost",
      subStageId: "crm-sub-lost-budget",
      status: CrmLeadStatus.inactive,
      tags: [],
      nextAction: CrmNextAction.none,
      nextFollowUpAt: null,
      lastActivityAt: daysAgo(15),
      lossReasonName: "Price Issue",
      notes: "Chose cheaper competitor",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: daysAgo(35),
    },
    {
      id: "crm-lead-008",
      name: "Nour El-Din",
      phone: "+20 100 555 1008",
      email: "nour@example.com",
      companyName: "Horizon Media",
      businessTypeName: "عقارات",
      source: CrmLeadSource.organic,
      ownerEmployeeId: OWNERS.omar,
      stageKey: "interested",
      subStageId: "crm-sub-interested-demo",
      status: CrmLeadStatus.active,
      tags: ["interested", "warm"],
      nextAction: CrmNextAction.email,
      nextFollowUpAt: hoursFromNow(2),
      lastActivityAt: hoursFromNow(-30),
      lossReasonName: null,
      notes: "",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: daysAgo(7),
    },
    {
      id: "crm-lead-009",
      name: "Rania Kamal",
      phone: "+20 155 555 1009",
      email: "rania@example.com",
      companyName: "Kamal Partners",
      businessTypeName: "مقاولات وبناء",
      source: CrmLeadSource.referral,
      ownerEmployeeId: OWNERS.dina,
      stageKey: "negotiation",
      subStageId: "crm-sub-negotiation-terms",
      status: CrmLeadStatus.active,
      tags: ["hot", "high_budget"],
      nextAction: CrmNextAction.call,
      nextFollowUpAt: daysAgo(1),
      lastActivityAt: daysAgo(4),
      lossReasonName: null,
      notes: "Waiting on budget approval",
      request: "Full package quote",
      budget: "Pending approval",
      convertedAt: null,
      createdAt: daysAgo(25),
    },
    {
      id: "crm-lead-010",
      name: "Mostafa Emad",
      phone: "+20 100 555 1010",
      email: "mostafa@example.com",
      companyName: "",
      businessTypeName: "أخرى",
      source: CrmLeadSource.facebook,
      ownerEmployeeId: OWNERS.salem,
      stageKey: "contacted",
      subStageId: "crm-sub-contacted-warm",
      status: CrmLeadStatus.active,
      tags: ["cold"],
      nextAction: CrmNextAction.follow_up,
      nextFollowUpAt: daysAgo(3),
      lastActivityAt: daysAgo(10),
      lossReasonName: null,
      notes: "",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: daysAgo(14),
    },
    {
      id: "crm-lead-011",
      name: "Farida Shawky",
      phone: "+20 111 555 1011",
      email: "farida@example.com",
      companyName: "Shawky Design",
      businessTypeName: "أخرى",
      source: CrmLeadSource.website,
      ownerEmployeeId: OWNERS.dina,
      stageKey: "new",
      subStageId: "crm-sub-new-review",
      status: CrmLeadStatus.active,
      tags: ["warm"],
      nextAction: CrmNextAction.call,
      nextFollowUpAt: hoursFromNow(12),
      lastActivityAt: hoursFromNow(-2),
      lossReasonName: null,
      notes: "",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: hoursFromNow(-8),
    },
    {
      id: "crm-lead-012",
      name: "Ibrahim Saad",
      phone: "+20 122 555 1012",
      email: "ibrahim@example.com",
      companyName: "Saad Motors",
      businessTypeName: "تجارة التجزئة",
      source: CrmLeadSource.whatsapp,
      ownerEmployeeId: OWNERS.omar,
      stageKey: "lost",
      subStageId: "crm-sub-lost-budget",
      status: CrmLeadStatus.inactive,
      tags: [],
      nextAction: CrmNextAction.none,
      nextFollowUpAt: null,
      lastActivityAt: daysAgo(20),
      lossReasonName: "No Response",
      notes: "",
      request: "",
      budget: "",
      convertedAt: null,
      createdAt: daysAgo(45),
    },
  ];
}

async function ensureCatalog(prisma: Db, companyId: string) {
  const stageCount = await prisma.crmStage.count({
    where: { companyId, deletedAt: null },
  });
  if (stageCount === 0) {
    await prisma.crmStage.createMany({
      data: DEFAULT_STAGES.map((s) => ({
        companyId,
        name: s.name,
        description: s.description,
        color: s.color,
        sortOrder: s.sortOrder,
        active: true,
        conversionProbability: s.conversionProbability,
        category: s.category,
        createdBy: "system",
        updatedBy: "system",
      })),
    });
  }

  const businessCount = await prisma.crmBusinessType.count({
    where: { companyId, deletedAt: null },
  });
  if (businessCount === 0) {
    await prisma.crmBusinessType.createMany({
      data: DEFAULT_BUSINESS_TYPES.map((name, sortOrder) => ({
        companyId,
        name,
        description: "",
        sortOrder,
        active: true,
        createdBy: "system",
        updatedBy: "system",
      })),
    });
  }

  const feedbackCount = await prisma.crmFeedbackType.count({
    where: { companyId, deletedAt: null },
  });
  if (feedbackCount === 0) {
    await prisma.crmFeedbackType.createMany({
      data: DEFAULT_FEEDBACK_TYPES.map((f, sortOrder) => ({
        companyId,
        name: f.name,
        description: "",
        sortOrder,
        active: true,
        isLossReason: f.isLossReason,
        createdBy: "system",
        updatedBy: "system",
      })),
    });
  }

  const stages = await prisma.crmStage.findMany({
    where: { companyId, deletedAt: null },
  });
  const stageIdByKey = new Map<string, string>();
  for (const stage of stages) {
    const key = STAGE_BY_NAME[stage.name];
    if (key) stageIdByKey.set(key, stage.id);
  }

  if (stageIdByKey.size < 9) {
    throw new Error(
      `CRM stages incomplete for ${companyId} (need New Lead…Lost). Run catalog bootstrap first.`
    );
  }

  for (const sub of SUB_STAGES) {
    const stageId = stageIdByKey.get(sub.stageKey);
    if (!stageId) continue;
    await prisma.crmSubStage.upsert({
      where: { id: sub.id },
      create: {
        id: sub.id,
        companyId,
        stageId,
        name: sub.name,
        description: sub.description,
        sortOrder: sub.sortOrder,
        active: true,
        createdBy: "system",
        updatedBy: "system",
      },
      update: {
        stageId,
        name: sub.name,
        description: sub.description,
        sortOrder: sub.sortOrder,
        active: true,
        deletedAt: null,
        isArchived: false,
        updatedBy: "system",
      },
    });
  }

  const businessTypes = await prisma.crmBusinessType.findMany({
    where: { companyId, deletedAt: null },
  });
  const businessTypeIdByName = new Map(
    businessTypes.map((b) => [b.name, b.id] as const)
  );

  const feedbackTypes = await prisma.crmFeedbackType.findMany({
    where: { companyId, deletedAt: null },
  });
  const feedbackTypeIdByName = new Map(
    feedbackTypes.map((f) => [f.name, f.id] as const)
  );

  return { stageIdByKey, businessTypeIdByName, feedbackTypeIdByName };
}

/** Wipe CRM transactional rows (keeps catalog stages / types). */
export async function wipeCrmDemoData(prisma: Db, companyId: string) {
  await prisma.crmCall.deleteMany({ where: { companyId } });
  await prisma.crmLeadActivity.deleteMany({ where: { companyId } });
  await prisma.crmLeadFeedback.deleteMany({ where: { companyId } });
  await prisma.crmLeadHistoryEvent.deleteMany({ where: { companyId } });
  await prisma.crmLead.deleteMany({ where: { companyId } });
}

/**
 * Ensure CRM sub-stages + professional sample leads/activities.
 * Idempotent when used after wipe; safe upserts for catalog extras.
 */
export async function seedCrmDemo(prisma: Db, companyId: string) {
  const { stageIdByKey, businessTypeIdByName, feedbackTypeIdByName } =
    await ensureCatalog(prisma, companyId);

  for (const lead of buildLeads()) {
    const stageId = stageIdByKey.get(lead.stageKey);
    if (!stageId) continue;
    const businessTypeId =
      businessTypeIdByName.get(lead.businessTypeName) ?? null;
    const lossReasonTypeId = lead.lossReasonName
      ? feedbackTypeIdByName.get(lead.lossReasonName) ?? null
      : null;
    const phoneNormalized = canonicalPhoneOrNull(lead.phone);

    await prisma.crmLead.upsert({
      where: { id: lead.id },
      create: {
        id: lead.id,
        companyId,
        name: lead.name,
        phone: lead.phone,
        phoneNormalized,
        email: lead.email,
        companyName: lead.companyName,
        businessTypeId,
        source: lead.source,
        ownerEmployeeId: lead.ownerEmployeeId,
        stageId,
        subStageId: lead.subStageId,
        status: lead.status,
        tags: lead.tags,
        nextAction: lead.nextAction,
        nextFollowUpAt: lead.nextFollowUpAt,
        lastActivityAt: lead.lastActivityAt,
        lossReasonTypeId,
        notes: lead.notes,
        request: lead.request,
        budget: lead.budget,
        convertedAt: lead.convertedAt,
        createdAt: lead.createdAt,
        createdBy: "system",
        updatedBy: "system",
      },
      update: {
        name: lead.name,
        phone: lead.phone,
        phoneNormalized,
        email: lead.email,
        companyName: lead.companyName,
        businessTypeId,
        source: lead.source,
        ownerEmployeeId: lead.ownerEmployeeId,
        stageId,
        subStageId: lead.subStageId,
        status: lead.status,
        tags: lead.tags,
        nextAction: lead.nextAction,
        nextFollowUpAt: lead.nextFollowUpAt,
        lastActivityAt: lead.lastActivityAt,
        lossReasonTypeId,
        notes: lead.notes,
        request: lead.request,
        budget: lead.budget,
        convertedAt: lead.convertedAt,
        deletedAt: null,
        isArchived: false,
        updatedBy: "system",
      },
    });
  }

  const activities: Array<{
    id: string;
    leadId: string;
    type: CrmActivityType;
    title: string;
    description: string;
    actorEmployeeId: string;
    occurredAt: Date;
  }> = [
    {
      id: "crm-act-001",
      leadId: "crm-lead-001",
      type: CrmActivityType.created,
      title: "Lead created",
      description: "Inbound from Facebook",
      actorEmployeeId: OWNERS.dina,
      occurredAt: daysAgo(12),
    },
    {
      id: "crm-act-002",
      leadId: "crm-lead-001",
      type: CrmActivityType.call,
      title: "Called the lead",
      description: "Discussed product fit",
      actorEmployeeId: OWNERS.dina,
      occurredAt: hoursFromNow(-5),
    },
    {
      id: "crm-act-003",
      leadId: "crm-lead-001",
      type: CrmActivityType.stage_change,
      title: "Stage changed",
      description: "Contacted → Qualified",
      actorEmployeeId: OWNERS.dina,
      occurredAt: hoursFromNow(-4),
    },
    {
      id: "crm-act-004",
      leadId: "crm-lead-002",
      type: CrmActivityType.email,
      title: "Proposal emailed",
      description: "Sent commercial offer PDF",
      actorEmployeeId: OWNERS.omar,
      occurredAt: hoursFromNow(-20),
    },
    {
      id: "crm-act-005",
      leadId: "crm-lead-004",
      type: CrmActivityType.meeting,
      title: "Discovery meeting",
      description: "Clinic workflow walkthrough",
      actorEmployeeId: OWNERS.dina,
      occurredAt: hoursFromNow(-10),
    },
    {
      id: "crm-act-006",
      leadId: "crm-lead-009",
      type: CrmActivityType.note,
      title: "Budget pending",
      description: "Client waiting on finance sign-off",
      actorEmployeeId: OWNERS.dina,
      occurredAt: daysAgo(4),
    },
  ];

  for (const act of activities) {
    await prisma.crmLeadActivity.upsert({
      where: { id: act.id },
      create: {
        id: act.id,
        companyId,
        leadId: act.leadId,
        type: act.type,
        title: act.title,
        description: act.description,
        actorEmployeeId: act.actorEmployeeId,
        occurredAt: act.occurredAt,
        createdBy: "system",
        updatedBy: "system",
      },
      update: {
        type: act.type,
        title: act.title,
        description: act.description,
        actorEmployeeId: act.actorEmployeeId,
        occurredAt: act.occurredAt,
        deletedAt: null,
        isArchived: false,
        updatedBy: "system",
      },
    });
  }
}

/** Full CRM demo refresh used by prisma seed + Settings → Reset Demo. */
export async function resetCrmDemo(prisma: Db, companyId: string) {
  await wipeCrmDemoData(prisma, companyId);
  await seedCrmDemo(prisma, companyId);
}
