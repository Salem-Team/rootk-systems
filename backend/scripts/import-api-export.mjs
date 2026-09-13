/**
 * Import a production API JSON export into Postgres via Prisma.
 * Usage:
 *   node scripts/import-api-export.mjs /path/to/prod-export-dir
 *
 * Password hashes are not available from the API — all imported users
 * get DEMO_PASSWORD (Rootk@2026) via the same scrypt format as seed.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scryptSync } from "node:crypto";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const DEMO_PASSWORD = "Rootk@2026";
const FIXED_DEMO_SALT = "rootk_demo_salt_v1";

function hashDemoPassword() {
  const hash = scryptSync(DEMO_PASSWORD, FIXED_DEMO_SALT, 64).toString("hex");
  return `scrypt$${FIXED_DEMO_SALT}$${hash}`;
}

const prisma = new PrismaClient();
const exportDir = process.argv[2];
if (!exportDir || !existsSync(exportDir)) {
  console.error("Usage: node scripts/import-api-export.mjs <export-dir>");
  process.exit(1);
}

function load(name) {
  const p = join(exportDir, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function unwrap(payload) {
  if (!payload) return [];
  const data = payload.data ?? payload;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

function dt(v) {
  if (v == null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateOnly(v) {
  const d = dt(v);
  return d;
}

function pickMeta(row) {
  return row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
}

async function upsertMany(label, rows, fn) {
  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    try {
      await fn(row);
      ok += 1;
    } catch (e) {
      fail += 1;
      if (fail <= 8) {
        console.warn(`[${label}] skip ${row?.id ?? "?"}:`, e.message);
      }
    }
  }
  console.log(`${label}: ok=${ok} fail=${fail} total=${rows.length}`);
}

async function main() {
  const passwordHash = hashDemoPassword();
  const COMPANY_ID = "cmp_rootk_001";

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: { id: COMPANY_ID, name: "ROOTK Systems" },
    update: { name: "ROOTK Systems" },
  });

  const settings = load("settings.json")?.data;
  if (settings) {
    await prisma.companySettings.upsert({
      where: { companyId: COMPANY_ID },
      create: {
        id: settings.id || undefined,
        companyId: COMPANY_ID,
        companyName: settings.name || "ROOTK Systems",
        legalName: settings.legalName || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        website: settings.website || "",
        timezone: settings.timezone || "Africa/Cairo",
        currency: settings.currency || "EGP",
        language: settings.language || "ar",
        appearance: settings.appearance || "system",
        notifications: settings.notifications || {},
        createdBy: settings.createdBy || "system",
        updatedBy: settings.updatedBy || "system",
        deletedAt: dt(settings.deletedAt),
        isArchived: Boolean(settings.isArchived),
        version: settings.version ?? 1,
        metadata: pickMeta(settings),
      },
      update: {
        companyName: settings.name || "ROOTK Systems",
        legalName: settings.legalName || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        website: settings.website || "",
        timezone: settings.timezone || "Africa/Cairo",
        currency: settings.currency || "EGP",
        language: settings.language || "ar",
        appearance: settings.appearance || "system",
        notifications: settings.notifications || {},
        updatedBy: settings.updatedBy || "system",
      },
    });
  }

  const schedule = load("schedule.json")?.data;
  if (schedule) {
    await prisma.workSchedule.upsert({
      where: { companyId: COMPANY_ID },
      create: {
        id: schedule.id || undefined,
        companyId: COMPANY_ID,
        config: schedule.config || schedule,
        metadata: pickMeta(schedule),
        createdBy: schedule.createdBy || "system",
        updatedBy: schedule.updatedBy || "system",
      },
      update: {
        config: schedule.config || schedule,
        metadata: pickMeta(schedule),
        updatedBy: schedule.updatedBy || "system",
      },
    });
  }

  await upsertMany("departments", unwrap(load("departments.json")), (row) =>
    prisma.department.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        name: row.name,
        nameAr: row.nameAr || row.name,
        code: row.code || row.name.slice(0, 8).toUpperCase(),
        color: row.color || "#082868",
        active: row.active !== false,
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        name: row.name,
        nameAr: row.nameAr || row.name,
        code: row.code || row.name.slice(0, 8).toUpperCase(),
        color: row.color || "#082868",
        active: row.active !== false,
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  await upsertMany("positions", unwrap(load("positions.json")), (row) =>
    prisma.jobPosition.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        title: row.title,
        department: row.department || "",
        grade: row.grade || "",
        reportsTo: row.reportsTo || "—",
        active: row.active !== false,
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        title: row.title,
        department: row.department || "",
        grade: row.grade || "",
        reportsTo: row.reportsTo || "—",
        active: row.active !== false,
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  await upsertMany("locations", unwrap(load("locations.json")), (row) =>
    prisma.officeLocation.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        name: row.name,
        city: row.city || "",
        address: row.address || "",
        timezone: row.timezone || "Africa/Cairo",
        capacity: row.capacity ?? 0,
        workingDays: row.workingDays || "Sun–Thu",
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        radiusMeters: row.radiusMeters ?? 200,
        active: row.active !== false,
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        name: row.name,
        city: row.city || "",
        address: row.address || "",
        timezone: row.timezone || "Africa/Cairo",
        capacity: row.capacity ?? 0,
        workingDays: row.workingDays || "Sun–Thu",
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        radiusMeters: row.radiusMeters ?? 200,
        active: row.active !== false,
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  await upsertMany("employees", unwrap(load("employees_all.json")), (row) =>
    prisma.employee.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        employeeCode: row.employeeId || row.employeeCode || row.id.slice(-8),
        name: row.name,
        email: row.email,
        department: row.department || "",
        position: row.position || "",
        location: row.location || null,
        phone: row.phone || null,
        managerName: row.manager || row.managerName || null,
        managerEmployeeIds: row.managerEmployeeIds || [],
        joinDate: dateOnly(row.joinDate) || new Date("2024-01-01"),
        status: row.status || "active",
        avatarUrl: row.avatarUrl || null,
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        employeeCode: row.employeeId || row.employeeCode || row.id.slice(-8),
        name: row.name,
        email: row.email,
        department: row.department || "",
        position: row.position || "",
        location: row.location || null,
        phone: row.phone || null,
        managerName: row.manager || row.managerName || null,
        managerEmployeeIds: row.managerEmployeeIds || [],
        joinDate: dateOnly(row.joinDate) || new Date("2024-01-01"),
        status: row.status || "active",
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  await upsertMany("users", unwrap(load("users_all.json")), (row) =>
    prisma.user.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        employeeId: row.employeeId || null,
        email: row.email,
        role: row.role || "employee",
        passwordHash,
        initials: row.initials || "RK",
        displayName: row.displayName || null,
        firstName: row.firstName || null,
        lastName: row.lastName || null,
        isActive: row.isActive !== false,
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: {
          ...pickMeta(row),
          importedPasswordReset: "Rootk@2026",
        },
      },
      update: {
        employeeId: row.employeeId || null,
        email: row.email,
        role: row.role || "employee",
        passwordHash,
        initials: row.initials || "RK",
        displayName: row.displayName || null,
        firstName: row.firstName || null,
        lastName: row.lastName || null,
        isActive: row.isActive !== false,
        updatedBy: row.updatedBy || "system",
        metadata: {
          ...pickMeta(row),
          importedPasswordReset: "Rootk@2026",
        },
      },
    })
  );

  const stages = unwrap(load("crm_stages.json"));
  await upsertMany("crm_stages", stages, (row) =>
    prisma.crmStage.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        name: row.name,
        description: row.description || "",
        color: row.color || "#64748b",
        sortOrder: row.sortOrder ?? 0,
        active: row.active !== false,
        conversionProbability: row.conversionProbability ?? null,
        category: row.category || "open",
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        name: row.name,
        description: row.description || "",
        color: row.color || "#64748b",
        sortOrder: row.sortOrder ?? 0,
        active: row.active !== false,
        conversionProbability: row.conversionProbability ?? null,
        category: row.category || "open",
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  const subFromStages = [];
  for (const st of stages) {
    for (const ss of st.subStages || []) {
      subFromStages.push({ ...ss, stageId: ss.stageId || st.id });
    }
  }
  const subStages = [
    ...subFromStages,
    ...unwrap(load("crm_sub_stages2.json")),
  ];
  const seenSub = new Set();
  const uniqueSubs = [];
  for (const ss of subStages) {
    if (!ss?.id || seenSub.has(ss.id)) continue;
    seenSub.add(ss.id);
    uniqueSubs.push(ss);
  }
  await upsertMany("crm_sub_stages", uniqueSubs, (row) =>
    prisma.crmSubStage.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        stageId: row.stageId,
        name: row.name,
        description: row.description || "",
        sortOrder: row.sortOrder ?? 0,
        active: row.active !== false,
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        stageId: row.stageId,
        name: row.name,
        description: row.description || "",
        sortOrder: row.sortOrder ?? 0,
        active: row.active !== false,
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  await upsertMany(
    "crm_feedback_types",
    unwrap(load("crm_feedback_types.json")),
    (row) =>
      prisma.crmFeedbackType.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          companyId: COMPANY_ID,
          name: row.name,
          description: row.description || "",
          sortOrder: row.sortOrder ?? 0,
          active: row.active !== false,
          isLossReason: Boolean(row.isLossReason),
          createdBy: row.createdBy || "system",
          updatedBy: row.updatedBy || "system",
          deletedAt: dt(row.deletedAt),
          isArchived: Boolean(row.isArchived),
          version: row.version ?? 1,
          metadata: pickMeta(row),
        },
        update: {
          name: row.name,
          description: row.description || "",
          sortOrder: row.sortOrder ?? 0,
          active: row.active !== false,
          isLossReason: Boolean(row.isLossReason),
          updatedBy: row.updatedBy || "system",
        },
      })
  );

  await upsertMany(
    "crm_business_types",
    unwrap(load("crm_business_types.json")),
    (row) =>
      prisma.crmBusinessType.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          companyId: COMPANY_ID,
          name: row.name,
          description: row.description || "",
          sortOrder: row.sortOrder ?? 0,
          active: row.active !== false,
          createdBy: row.createdBy || "system",
          updatedBy: row.updatedBy || "system",
          deletedAt: dt(row.deletedAt),
          isArchived: Boolean(row.isArchived),
          version: row.version ?? 1,
          metadata: pickMeta(row),
        },
        update: {
          name: row.name,
          description: row.description || "",
          sortOrder: row.sortOrder ?? 0,
          active: row.active !== false,
          updatedBy: row.updatedBy || "system",
        },
      })
  );

  await upsertMany("crm_leads", unwrap(load("crm_leads_all.json")), (row) =>
    prisma.crmLead.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        name: row.name,
        phone: row.phone || "",
        phoneNormalized: row.phoneNormalized || null,
        email: row.email || "",
        companyName: row.companyName || "",
        businessTypeId: row.businessTypeId || null,
        source: row.source || "other",
        ownerEmployeeId: row.ownerEmployeeId || null,
        stageId: row.stageId,
        subStageId: row.subStageId || null,
        status: row.status || "active",
        tags: row.tags || [],
        nextAction: row.nextAction || "none",
        nextFollowUpAt: dt(row.nextFollowUpAt),
        lastActivityAt: dt(row.lastActivityAt),
        lossReasonTypeId: row.lossReasonTypeId || null,
        notes: row.notes || "",
        convertedAt: dt(row.convertedAt),
        createdAt: dt(row.createdAt) || new Date(),
        updatedAt: dt(row.updatedAt) || new Date(),
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        name: row.name,
        phone: row.phone || "",
        phoneNormalized: row.phoneNormalized || null,
        email: row.email || "",
        companyName: row.companyName || "",
        businessTypeId: row.businessTypeId || null,
        source: row.source || "other",
        ownerEmployeeId: row.ownerEmployeeId || null,
        stageId: row.stageId,
        subStageId: row.subStageId || null,
        status: row.status || "active",
        tags: row.tags || [],
        nextAction: row.nextAction || "none",
        nextFollowUpAt: dt(row.nextFollowUpAt),
        lastActivityAt: dt(row.lastActivityAt),
        lossReasonTypeId: row.lossReasonTypeId || null,
        notes: row.notes || "",
        convertedAt: dt(row.convertedAt),
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  const activities =
    unwrap(load("crm_activities_all.json")).length > 0
      ? unwrap(load("crm_activities_all.json"))
      : unwrap(load("crm_activities.json"));
  await upsertMany("crm_activities", activities, (row) =>
    prisma.crmLeadActivity.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        leadId: row.leadId,
        type: row.type || "note",
        title: row.title || "Activity",
        description: row.description || "",
        actorEmployeeId: row.actorEmployeeId || null,
        occurredAt: dt(row.occurredAt) || new Date(),
        createdAt: dt(row.createdAt) || new Date(),
        updatedAt: dt(row.updatedAt) || new Date(),
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        type: row.type || "note",
        title: row.title || "Activity",
        description: row.description || "",
        actorEmployeeId: row.actorEmployeeId || null,
        occurredAt: dt(row.occurredAt) || new Date(),
        updatedBy: row.updatedBy || "system",
        metadata: pickMeta(row),
      },
    })
  );

  await upsertMany(
    "crm_feedback",
    unwrap(load("crm_feedback_all.json")),
    (row) =>
      prisma.crmLeadFeedback.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          companyId: COMPANY_ID,
          leadId: row.leadId,
          feedbackTypeId: row.feedbackTypeId,
          customerFeedback: row.customerFeedback || "",
          callAnswered: row.callAnswered !== false,
          nextAction: row.nextAction || "none",
          nextFollowUpAt: dt(row.nextFollowUpAt),
          meetingMode: row.meetingMode || null,
          meetingLocation: row.meetingLocation || null,
          notes: row.notes || "",
          recordedByEmployeeId: row.recordedByEmployeeId || null,
          createdAt: dt(row.createdAt) || new Date(),
          updatedAt: dt(row.updatedAt) || new Date(),
          createdBy: row.createdBy || "system",
          updatedBy: row.updatedBy || "system",
          deletedAt: dt(row.deletedAt),
          isArchived: Boolean(row.isArchived),
          version: row.version ?? 1,
          metadata: pickMeta(row),
        },
        update: {
          feedbackTypeId: row.feedbackTypeId,
          customerFeedback: row.customerFeedback || "",
          callAnswered: row.callAnswered !== false,
          nextAction: row.nextAction || "none",
          nextFollowUpAt: dt(row.nextFollowUpAt),
          meetingMode: row.meetingMode || null,
          meetingLocation: row.meetingLocation || null,
          notes: row.notes || "",
          recordedByEmployeeId: row.recordedByEmployeeId || null,
          updatedBy: row.updatedBy || "system",
        },
      })
  );

  await upsertMany("attendance", unwrap(load("attendance_all.json")), (row) =>
    prisma.attendanceRecord.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        employeeId: row.employeeId,
        date: dateOnly(row.date) || new Date(),
        checkIn: dt(row.checkIn),
        checkOut: dt(row.checkOut),
        status: row.status || "present",
        workingMinutes: row.workingMinutes ?? 0,
        grossMinutes: row.grossMinutes ?? 0,
        breakAppliedMinutes: row.breakAppliedMinutes ?? 0,
        earlyLeaveMinutes: row.earlyLeaveMinutes ?? 0,
        overtimeMinutes: row.overtimeMinutes ?? 0,
        isLate: Boolean(row.isLate),
        isEarlyLeave: Boolean(row.isEarlyLeave),
        lateMinutes: row.lateMinutes ?? 0,
        note: row.note || null,
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        checkIn: dt(row.checkIn),
        checkOut: dt(row.checkOut),
        status: row.status || "present",
        workingMinutes: row.workingMinutes ?? 0,
        grossMinutes: row.grossMinutes ?? 0,
        breakAppliedMinutes: row.breakAppliedMinutes ?? 0,
        earlyLeaveMinutes: row.earlyLeaveMinutes ?? 0,
        overtimeMinutes: row.overtimeMinutes ?? 0,
        isLate: Boolean(row.isLate),
        isEarlyLeave: Boolean(row.isEarlyLeave),
        lateMinutes: row.lateMinutes ?? 0,
        note: row.note || null,
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  await upsertMany("work_tasks", unwrap(load("work_tasks_all.json")), (row) =>
    prisma.workTask.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        companyId: COMPANY_ID,
        title: row.title,
        description: row.description || "",
        status: row.status || "todo",
        priority: row.priority || "medium",
        dueDate: dt(row.dueDate),
        tag: row.tag || "",
        estimateMin: row.estimateMin ?? 0,
        assigneeIds: row.assigneeIds || [],
        assigneeProgress: row.assigneeProgress || [],
        relatedMeetingId: row.relatedMeetingId || null,
        targetId: null, // targets catalog not fully exported via API
        subItems: row.subItems || [],
        origin: row.origin || "assigned",
        requireEvidenceLinks: Boolean(row.requireEvidenceLinks),
        requireEvidenceNotes: Boolean(row.requireEvidenceNotes),
        evidenceLinks: row.evidenceLinks || [],
        evidenceNotes: row.evidenceNotes || "",
        assignedAt: dt(row.assignedAt) || new Date(),
        completedAt: dt(row.completedAt),
        createdAt: dt(row.createdAt) || new Date(),
        updatedAt: dt(row.updatedAt) || new Date(),
        createdBy: row.createdBy || "system",
        updatedBy: row.updatedBy || "system",
        deletedAt: dt(row.deletedAt),
        isArchived: Boolean(row.isArchived),
        version: row.version ?? 1,
        metadata: pickMeta(row),
      },
      update: {
        title: row.title,
        description: row.description || "",
        status: row.status || "todo",
        priority: row.priority || "medium",
        dueDate: dt(row.dueDate),
        tag: row.tag || "",
        estimateMin: row.estimateMin ?? 0,
        assigneeIds: row.assigneeIds || [],
        assigneeProgress: row.assigneeProgress || [],
        subItems: row.subItems || [],
        origin: row.origin || "assigned",
        requireEvidenceLinks: Boolean(row.requireEvidenceLinks),
        requireEvidenceNotes: Boolean(row.requireEvidenceNotes),
        evidenceLinks: row.evidenceLinks || [],
        evidenceNotes: row.evidenceNotes || "",
        completedAt: dt(row.completedAt),
        targetId: null,
        updatedBy: row.updatedBy || "system",
      },
    })
  );

  await upsertMany(
    "notifications",
    unwrap(load("notifications_all.json")),
    (row) =>
      prisma.appNotification.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          companyId: COMPANY_ID,
          titleKey: row.titleKey,
          bodyKey: row.bodyKey,
          vars: row.vars ?? null,
          category: row.category || "system",
          priority: row.priority || "normal",
          audience: row.audience || "all",
          recipientIds: row.recipientIds || [],
          href: row.href || null,
          entityType: row.entityType || null,
          entityId: row.entityId || null,
          actorId: row.actorId || null,
          readBy: row.readBy || [],
          createdAt: dt(row.createdAt) || new Date(),
          updatedAt: dt(row.updatedAt) || new Date(),
          createdBy: row.createdBy || "system",
          updatedBy: row.updatedBy || "system",
          deletedAt: dt(row.deletedAt),
          isArchived: Boolean(row.isArchived),
          version: row.version ?? 1,
          metadata: pickMeta(row),
        },
        update: {
          titleKey: row.titleKey,
          bodyKey: row.bodyKey,
          vars: row.vars ?? null,
          category: row.category || "system",
          priority: row.priority || "normal",
          audience: row.audience || "all",
          recipientIds: row.recipientIds || [],
          href: row.href || null,
          readBy: row.readBy || [],
          updatedBy: row.updatedBy || "system",
        },
      })
  );

  console.log("Import finished. Default login password for all users:", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
