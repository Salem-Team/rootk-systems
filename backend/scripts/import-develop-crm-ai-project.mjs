#!/usr/bin/env node
/**
 * Idempotent import of Develop CRM ( AI ) into the existing rootk-systems WorkProject.
 * Does not create a second project. No fake assignees or due dates.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const PROJECT_NAME = "Develop CRM ( AI )";
const PROJECT_KEY = "develop-crm-ai";
const COMPANY_ID = "cmp_rootk_001";
const payloadPath = process.argv[2] || "/tmp/develop-crm-ai.payload.json";

const prisma = new PrismaClient();

function stableId(prefix, seed) {
  const hash = createHash("sha1").update(seed).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

function mapPriority(raw) {
  if (raw === "P0" || raw === "P1") return "high";
  if (raw === "P3") return "low";
  return "medium";
}

function buildDescription(task, epicName) {
  const parts = [];
  if (epicName) parts.push(`Epic: ${epicName}`);
  if (task.description) parts.push(task.description);
  if (task.acceptanceCriteria?.length) {
    parts.push("Acceptance criteria:");
    for (const line of task.acceptanceCriteria) parts.push(`- ${line}`);
  }
  if (task.testRequirements?.length) {
    parts.push("Tests:");
    for (const line of task.testRequirements) parts.push(`- ${line}`);
  }
  if (task.risks?.length) {
    parts.push("Risks:");
    for (const line of task.risks) parts.push(`- ${line}`);
  }
  if (task.deps?.length) parts.push(`Depends on: ${task.deps.join(", ")}`);
  if (task.component) parts.push(`Component: ${task.component}`);
  if (task.implementationNotes) parts.push(`Notes: ${task.implementationNotes}`);
  return parts.join("\n\n").slice(0, 8000);
}

async function main() {
  const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
  const project = await prisma.workProject.findFirst({
    where: { companyId: COMPANY_ID, name: PROJECT_NAME, deletedAt: null },
  });
  if (!project) {
    throw new Error(`Project "${PROJECT_NAME}" not found in company ${COMPANY_ID}`);
  }

  const epicNameByKey = new Map(payload.epics.map((e) => [e.key, e.name]));
  const mains = payload.tasks.filter((t) => !t.parentExternalId);
  const subs = payload.tasks.filter((t) => t.parentExternalId);
  const subsByParent = new Map();
  for (const sub of subs) {
    const list = subsByParent.get(sub.parentExternalId) ?? [];
    list.push(sub);
    subsByParent.set(sub.parentExternalId, list);
  }

  const phaseIdByKey = new Map(
    payload.phases.map((phase, index) => [
      phase.key,
      stableId("ph", `${PROJECT_KEY}:${phase.key}`),
    ]),
  );

  // Remove previously imported work tasks for this project (idempotent rebuild).
  const existing = await prisma.workTask.findMany({
    where: {
      companyId: COMPANY_ID,
      projectId: project.id,
      deletedAt: null,
      metadata: { path: ["sourceProjectKey"], equals: PROJECT_KEY },
    },
    select: { id: true },
  });
  if (existing.length) {
    await prisma.workTask.updateMany({
      where: { id: { in: existing.map((row) => row.id) } },
      data: { deletedAt: new Date(), isArchived: true },
    });
  }

  const workTaskIdByExternal = new Map();
  const phases = [];

  for (const [index, phase] of payload.phases.entries()) {
    const phaseId = phaseIdByKey.get(phase.key);
    const phaseMains = mains.filter((t) => t.phaseKey === phase.key);
    const phaseTasks = [];

    for (const task of phaseMains) {
      const epicName = epicNameByKey.get(task.epicKey) ?? task.epicKey;
      const childSubs = subsByParent.get(task.externalId) ?? [];
      const subItems = childSubs.map((sub, subIndex) => ({
        id: stableId("sub", `${task.externalId}:${subIndex + 1}`),
        label: String(sub.title).slice(0, 200),
        done: false,
      }));
      const title = `${task.externalId} — ${task.title}`.slice(0, 240);
      const description = buildDescription(task, epicName);
      const estimateMin =
        typeof task.estimateHours === "number" && task.estimateHours > 0
          ? Math.min(Math.round(task.estimateHours * 60), 100000)
          : 0;
      const workTaskId = stableId("wt", `${PROJECT_KEY}:${task.externalId}`);

      await prisma.workTask.create({
        data: {
          id: workTaskId,
          companyId: COMPANY_ID,
          title,
          description,
          status: "todo",
          priority: mapPriority(task.priority),
          dueDate: null,
          estimateMin,
          assigneeIds: [],
          assigneeProgress: [],
          subItems,
          origin: "assigned",
          projectId: project.id,
          phaseId,
          createdBy: project.createdBy ?? project.leadId,
          updatedBy: project.createdBy ?? project.leadId,
          metadata: {
            sourceProjectKey: PROJECT_KEY,
            externalId: task.externalId,
            epicKey: task.epicKey,
            epicName,
            phaseKey: task.phaseKey,
            sourcePriority: task.priority,
            deps: task.deps ?? [],
            component: task.component ?? null,
            optional: Boolean(task.optional),
          },
        },
      });
      workTaskIdByExternal.set(task.externalId, workTaskId);

      phaseTasks.push({
        id: stableId("pt", `${PROJECT_KEY}:${task.externalId}`),
        title,
        description,
        status: "todo",
        priority: mapPriority(task.priority),
        dueDate: "",
        estimateMin,
        assigneeIds: [],
        workTaskId,
        externalId: task.externalId,
        epicKey: task.epicKey,
        epicName,
        deps: task.deps ?? [],
        subItems,
      });
    }

    phases.push({
      id: phaseId,
      name: phase.name,
      description: `${phase.description ?? phase.name}\n\nEpics in this phase: ${
        payload.epics.filter((e) => e.phaseKey === phase.key).length
      } · Tasks: ${phaseMains.length}`,
      status: index === 0 ? "active" : "upcoming",
      startDate: "",
      endDate: "",
      tasks: phaseTasks,
    });
  }

  const updated = await prisma.workProject.update({
    where: { id: project.id },
    data: {
      status: "active",
      description:
        payload.project.description ||
        "ROOTK AI ecosystem implementation plan (phases, epics, tasks, subtasks).",
      technicalDetails: [
        `projectKey: ${PROJECT_KEY}`,
        `phases: ${payload.phases.length}`,
        `epics: ${payload.epics.length}`,
        `mainTasks: ${mains.length}`,
        `subtasks: ${subs.length}`,
        `dependencies: ${payload.meta?.dependencyEdges ?? "n/a"}`,
        "",
        project.technicalDetails || "",
      ]
        .join("\n")
        .slice(0, 20000),
      phases,
      metadata: {
        ...(typeof project.metadata === "object" && project.metadata && !Array.isArray(project.metadata)
          ? project.metadata
          : {}),
        sourceProjectKey: PROJECT_KEY,
        importedAt: new Date().toISOString(),
        counts: {
          phases: phases.length,
          epics: payload.epics.length,
          mainTasks: mains.length,
          subtasks: subs.length,
          dependencies: payload.meta?.dependencyEdges ?? 0,
        },
      },
      version: { increment: 1 },
      updatedBy: project.createdBy ?? project.leadId,
    },
  });

  const linkedTasks = await prisma.workTask.count({
    where: {
      companyId: COMPANY_ID,
      projectId: project.id,
      deletedAt: null,
      metadata: { path: ["sourceProjectKey"], equals: PROJECT_KEY },
    },
  });
  const phaseTaskCount = phases.reduce((n, p) => n + p.tasks.length, 0);
  const subtaskCount = phases.reduce(
    (n, p) => n + p.tasks.reduce((m, t) => m + (t.subItems?.length ?? 0), 0),
    0,
  );

  console.log(
    JSON.stringify(
      {
        projectId: updated.id,
        projectName: updated.name,
        companyId: COMPANY_ID,
        phases: phases.length,
        phaseTaskCount,
        workTasksCreated: linkedTasks,
        subtaskCount,
        workTaskIdSample: [...workTaskIdByExternal.entries()].slice(0, 3),
      },
      null,
      2,
    ),
  );

  if (phases.length !== 8 || phaseTaskCount !== 283 || subtaskCount !== 1229 || linkedTasks !== 283) {
    throw new Error(
      `Verification failed phases=${phases.length} tasks=${phaseTaskCount} subs=${subtaskCount} workTasks=${linkedTasks}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
