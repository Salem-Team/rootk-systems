/**
 * Project plans: form normalization, schema, service rules, and date round-trip.
 * Run: npx tsx scripts/verify-work-projects.ts
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  emptyProjectForm,
  emptyProjectPhase,
  emptyProjectTask,
  normalizeProjectForm,
  projectIncludesEmployee,
  summarizePhases,
} from "../src/lib/work-project";
import { workProjectBodySchema } from "../src/schemas/work-project.schema";
import {
  WorkProjectsService,
  projectCalendarDate,
  projectVisibleToEmployee,
  sanitizeProjectPhases,
} from "../backend/src/work/work-projects.service";

let failed = 0;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

function baseForm() {
  const phase = emptyProjectPhase();
  const task = emptyProjectTask();
  return {
    ...emptyProjectForm("emp-1"),
    name: "  إطلاق الموقع  ",
    description: " تفاصيل ",
    startDate: "2026-09-23",
    endDate: "2026-10-01",
    memberIds: ["emp-1", "emp-2"],
    phases: [
      {
        ...phase,
        name: " البناء ",
        startDate: "2026-09-23",
        endDate: "2026-09-30",
        tasks: [
          {
            ...task,
            title: "  الواجهة  ",
            assigneeIds: ["emp-2", "outsider"],
            estimateMin: 90,
            status: "todo" as const,
            priority: "medium" as const,
          },
          { ...emptyProjectTask(), title: "   " },
        ],
      },
      { ...emptyProjectPhase(), name: "   ", tasks: [] },
    ],
  };
}

const normalized = normalizeProjectForm(baseForm());
assert(normalized?.name === "إطلاق الموقع", "trims the project name");
assert(normalized?.memberIds.includes("emp-1"), "keeps the lead on the team");
assert(normalized?.phases.length === 1, "drops a blank phase");
assert(normalized?.phases[0]?.tasks.length === 1, "drops a blank task");
assert(
  normalized?.phases[0]?.tasks[0]?.assigneeIds.join() === "emp-2",
  "keeps only teammates on a task"
);
assert(
  summarizePhases(normalized?.phases ?? []).minutes === 90,
  "sums planned minutes"
);

assert(normalizeProjectForm({ ...baseForm(), name: " " }) === null, "rejects a missing name");
assert(normalizeProjectForm({ ...baseForm(), leadId: "" }) === null, "rejects a missing lead");
const flipped = normalizeProjectForm({ ...baseForm(), endDate: "2026-09-01" });
assert(
  flipped?.startDate === "2026-09-01" && flipped.endDate === "2026-09-23",
  "keeps a reversed range by putting the earlier day first"
);

const unnamed = baseForm();
unnamed.phases[0] = { ...unnamed.phases[0], name: " " };
assert(normalizeProjectForm(unnamed) === null, "rejects tasks inside an unnamed phase");

const parsed = workProjectBodySchema.safeParse(normalized);
assert(parsed.success, "schema accepts a normalized project");
const badLead = workProjectBodySchema.safeParse({
  ...normalized,
  memberIds: ["emp-2"],
});
assert(!badLead.success, "schema requires the lead to be on the team");
const swappedPhase = normalizeProjectForm({
  ...baseForm(),
  phases: [
    {
      ...baseForm().phases[0],
      name: "HR",
      startDate: "2026-09-24",
      endDate: "2026-09-22",
      tasks: [],
    },
  ],
});
assert(
  swappedPhase?.phases[0]?.startDate === "2026-09-22" &&
    swappedPhase.phases[0]?.endDate === "2026-09-24",
  "a phase from the 22nd to the 24th is saved in order"
);

const cleaned = sanitizeProjectPhases(
  [
    {
      id: "ph1",
      name: "Build",
      tasks: [
        { id: "t1", title: "API", assigneeIds: ["emp-2", "outsider"] },
        { title: " " },
      ],
    },
    { name: "", tasks: [] },
  ],
  ["emp-1", "emp-2"]
);
assert(cleaned.length === 1 && cleaned[0]?.tasks.length === 1, "sanitize drops empty rows");
assert(
  cleaned[0]?.tasks[0]?.assigneeIds.join() === "emp-2",
  "sanitize removes people outside the team"
);
assert(
  projectCalendarDate("2026-09-23")?.toISOString() === "2026-09-23T00:00:00.000Z",
  "calendar dates are UTC midnight"
);

const admin = {
  userId: "user-1",
  role: "admin" as const,
  employeeId: "emp-admin",
  permissions: [] as string[],
};

async function checkService() {
let storedStart: Date | null = null;
const service = new WorkProjectsService({
  workProject: {
    create: async ({
      data,
    }: {
      data: {
        name: string;
        description?: string;
        status?: string;
        startDate: Date | null;
        leadId: string;
        memberIds: string[];
        phases: unknown;
      };
    }) => {
      storedStart = data.startDate;
      return {
        id: "prj_test",
        companyId: "co",
        name: data.name,
        description: data.description ?? "",
        status: data.status ?? "planning",
        startDate: data.startDate,
        endDate: null,
        leadId: data.leadId,
        memberIds: data.memberIds,
        phases: data.phases,
        createdAt: new Date("2026-09-23T12:00:00.000Z"),
        updatedAt: new Date("2026-09-23T12:00:00.000Z"),
        createdBy: "user-1",
        updatedBy: "user-1",
        deletedAt: null,
        isArchived: false,
        version: 1,
        metadata: {},
      };
    },
    findMany: async () => [],
  },
} as never);

const created = await service.createProject("co", admin, {
  name: "Launch",
  leadId: "emp-1",
  memberIds: ["emp-2"],
  startDate: "2026-09-23",
  endDate: "2026-10-01",
  phases: cleaned,
});
assert(created.startDate === "2026-09-23", "saved project reads the same start date");
assert(
  (storedStart as Date | null)?.toISOString() === "2026-09-23T00:00:00.000Z",
  "service stores the start date at UTC midnight"
);
assert(created.memberIds[0] === "emp-1", "service adds the lead to the team");

let employeeBlocked = false;
try {
  await service.createProject(
    "co",
    { ...admin, role: "employee", permissions: ["tasks.viewOwn"] },
    { name: "Nope", leadId: "emp-1", memberIds: ["emp-1"] }
  );
} catch {
  employeeBlocked = true;
}
assert(employeeBlocked, "an employee without assign permission cannot create");

const allowed = await service.createProject(
  "co",
  { ...admin, role: "employee", permissions: ["tasks.assign"] },
  { name: "Allowed", leadId: "emp-1", memberIds: ["emp-1"], startDate: "2026-09-23" }
);
assert(allowed.name === "Allowed", "an employee with assign permission can create");

let phaseRejected = false;
try {
  await service.createProject("co", admin, {
    name: "Bad phase",
    leadId: "emp-1",
    memberIds: ["emp-1"],
    phases: [{ name: "", tasks: [{ title: "Orphan" }] }],
  });
} catch {
  phaseRejected = true;
}
assert(phaseRejected, "service rejects tasks in an unnamed phase");

const taskOnly = {
  leadId: "emp-9",
  memberIds: ["emp-9"],
  phases: [{ tasks: [{ assigneeIds: ["emp-task"] }] }],
};
assert(
  projectVisibleToEmployee(taskOnly, "emp-task"),
  "a task assignee can see the project"
);
assert(
  !projectVisibleToEmployee(taskOnly, "emp-outsider"),
  "someone outside the project cannot see it"
);
assert(
  projectIncludesEmployee(
    {
      leadId: "emp-9",
      memberIds: ["emp-9"],
      phases: [
        {
          id: "ph",
          name: "HR",
          description: "",
          status: "active",
          startDate: "",
          endDate: "",
          tasks: [
            {
              id: "t",
              title: "Call",
              description: "",
              status: "todo",
              priority: "medium",
              dueDate: "",
              estimateMin: 0,
              assigneeIds: ["emp-task"],
            },
          ],
        },
      ],
    },
    "emp-task"
  ),
  "local list keeps a task assignee"
);
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const text = readFileSync(resolve("backend/.env"), "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^DATABASE_URL=(.*)$/);
    if (!match) continue;
    process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, "");
  }
}

async function checkDatabaseRoundTrip() {
  loadDatabaseUrl();
  const require = createRequire(resolve("backend/package.json"));
  const { PrismaClient } = require("@prisma/client") as {
    PrismaClient: new () => {
      company: { findFirst: (args: { select: { id: true } }) => Promise<{ id: string } | null> };
      workProject: {
        create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; startDate: Date | null }>;
        delete: (args: { where: { id: string } }) => Promise<unknown>;
      };
      $disconnect: () => Promise<void>;
    };
  };
  const prisma = new PrismaClient();
  try {
    const company = await prisma.company.findFirst({ select: { id: true } });
    assert(company, "database has a company to round-trip against");
    if (!company) return;
    const row = await prisma.workProject.create({
      data: {
        companyId: company.id,
        name: "verify-work-projects",
        leadId: "emp-verify",
        memberIds: ["emp-verify"],
        startDate: new Date("2026-09-23T00:00:00.000Z"),
        endDate: new Date("2026-10-01T00:00:00.000Z"),
        phases: [],
      },
    });
    assert(
      row.startDate?.toISOString().slice(0, 10) === "2026-09-23",
      "postgres date column keeps 2026-09-23"
    );
    await prisma.workProject.delete({ where: { id: row.id } });
    console.log("✓ removed the temporary database row");
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkService();
  await checkDatabaseRoundTrip();
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nProject checks passed");
}

void main();
