/**
 * Target User Agent — simulates a real Admin + Employee using the Targets module.
 *
 * Forces local dual-mode, boots seed data, runs end-to-end scenarios through
 * the same services the UI uses, then writes a human-readable report.
 *
 * Run:
 *   npm run agent:targets
 *   npx tsx scripts/agents/target-user-agent.ts
 */
process.env.NEXT_PUBLIC_DATA_SOURCE = "local";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type StepResult = {
  id: string;
  actor: "admin" | "employee" | "system";
  title: string;
  ok: boolean;
  detail: string;
  data?: unknown;
};

const steps: StepResult[] = [];
let failed = 0;

function record(step: StepResult) {
  steps.push(step);
  const mark = step.ok ? "PASS" : "FAIL";
  if (!step.ok) failed += 1;
  console.log(`[${mark}] (${step.actor}) ${step.title} — ${step.detail}`);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const { MemoryStorageAdapter, setStorageAdapter, StorageKeys } =
    await import("../../src/storage");
  const memory = new MemoryStorageAdapter();
  setStorageAdapter(memory);

  const { resetDemoData } = await import("../../src/storage/bootstrap");
  await resetDemoData();

  const { useSessionStore } = await import("../../src/stores/session-store");
  const targets = await import("../../src/services/targets.service");
  const work = await import("../../src/services/work.service");
  const { getStorageAdapter } = await import("../../src/storage");

  function asAdmin() {
    useSessionStore.setState({
      authenticated: true,
      role: "admin",
      user: {
        id: "emp-001",
        employeeId: "RK-1001",
        displayName: "Salem Ayman",
        firstName: "Salem",
        lastName: "Ayman",
        nameKey: "user.adminFullName",
        firstNameKey: "user.adminFirstName",
        email: "salem@rootk.systems",
        role: "admin",
        initials: "SA",
      },
      accessToken: "agent-local-admin",
      refreshToken: null,
    });
  }

  function asEmployee(employeeEntityId = "emp-003") {
    useSessionStore.setState({
      authenticated: true,
      role: "employee",
      user: {
        id: employeeEntityId,
        employeeId:
          employeeEntityId === "emp-003"
            ? "RK-1003"
            : employeeEntityId === "emp-002"
              ? "RK-1002"
              : "RK-1004",
        displayName: "Yousef Mansour",
        firstName: "Yousef",
        lastName: "Mansour",
        nameKey: "user.employeeFullName",
        firstNameKey: "user.employeeFirstName",
        email: `${employeeEntityId}@rootk.systems`,
        role: "employee",
        initials: "EM",
      },
      accessToken: "agent-local-employee",
      refreshToken: null,
    });
  }

  // ── 1) Admin reviews catalog ────────────────────────────────────────────
  asAdmin();
  {
    const cats = await targets.getTargetCategories();
    const types = await targets.getTargetTypes();
    const ok = cats.success && types.success && cats.data.length >= 3;
    record({
      id: "catalog-load",
      actor: "admin",
      title: "Open Target Catalog",
      ok,
      detail: ok
        ? `${cats.data.length} categories, ${types.data.length} types`
        : cats.message ?? types.message ?? "failed",
      data: {
        categories: cats.data.map((c) => c.name),
        types: types.data.map((t) => t.name),
      },
    });
  }

  // ── 2) Admin creates Operations category + type ─────────────────────────
  let opsCategoryId = "";
  let opsTypeId = "";
  {
    const cat = await targets.saveTargetCategory({
      name: "Agent Demo — Operations",
      color: "#0F766E",
      icon: "Building2",
      description: "Created by Target User Agent for live demo",
      active: true,
      sortOrder: 90,
    });
    opsCategoryId = cat.data.id;
    const typ = await targets.saveTargetType({
      categoryId: opsCategoryId,
      name: "Site Visits",
      description: "On-site customer visits",
      unit: "visits",
      taskTitleTemplate: "Site Visit #{n}",
      active: true,
      sortOrder: 1,
    });
    opsTypeId = typ.data.id;
    const ok = cat.success && typ.success && Boolean(opsCategoryId && opsTypeId);
    record({
      id: "catalog-create",
      actor: "admin",
      title: "Create category + type (Operations / Site Visits)",
      ok,
      detail: ok
        ? `category=${opsCategoryId} type=${opsTypeId}`
        : cat.message ?? typ.message ?? "failed",
    });
  }

  // ── 3) Admin assigns a fresh target to Yousef (emp-003) ─────────────────
  let assignedTargetId = "";
  {
    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
    const end = endDate.toISOString().slice(0, 10);

    const res = await targets.assignTarget({
      title: "Agent Demo — 5 Site Visits",
      description:
        "Live agent scenario: auto-generate 5 visit tasks; progress must come from task completion only.",
      categoryId: opsCategoryId,
      typeId: opsTypeId,
      quantity: 5,
      unit: "visits",
      startDate: start,
      endDate: end,
      priority: "high",
      weight: 1,
      assigneeScope: "employee",
      assigneeIds: ["emp-003"],
      department: "Design",
      branch: "Cairo",
      roleKey: "",
      ownerId: "emp-001",
      notes: "Created by Target User Agent",
      status: "assigned",
      generateTasks: true,
    });
    assignedTargetId = res.data.id;
    const tasks = await work.getWorkTasks({ employeeId: "emp-003" });
    const linked = tasks.data.filter((t) => t.targetId === assignedTargetId);
    const ok =
      res.success &&
      Boolean(assignedTargetId) &&
      linked.length === 5 &&
      res.data.completedQuantity === 0;
    record({
      id: "assign-target",
      actor: "admin",
      title: "Assign target + auto-create 5 tasks",
      ok,
      detail: ok
        ? `target=${assignedTargetId}, linkedTasks=${linked.length}, progress=0%`
        : res.message ?? `linked=${linked.length}`,
      data: {
        targetId: assignedTargetId,
        linkedTaskIds: linked.map((t) => t.id),
        title: res.data.title,
      },
    });
  }

  // ── 4) Employee completes 2 tasks → progress must become 40% ───────────
  asEmployee("emp-003");
  {
    const tasksRes = await work.getWorkTasks({ employeeId: "emp-003" });
    const linked = tasksRes.data.filter(
      (t) => t.targetId === assignedTargetId && t.status !== "completed"
    );
    assert(linked.length >= 2, "expected at least 2 open linked tasks");

    const first = await work.updateWorkTaskStatus(linked[0].id, "completed");
    const second = await work.updateWorkTaskStatus(linked[1].id, "completed");

    // Allow async recalculate (fire-and-forget in work.service)
    await new Promise((r) => setTimeout(r, 800));

    const targetRes = await targets.getTarget(assignedTargetId);
    const pct = targetRes.data?.metrics?.percentage ?? -1;
    const completed = targetRes.data?.completedQuantity ?? -1;
    const ok =
      first.success &&
      second.success &&
      targetRes.success &&
      completed === 2 &&
      pct === 40;
    record({
      id: "employee-progress",
      actor: "employee",
      title: "Complete 2 tasks → target progress auto-updates to 40%",
      ok,
      detail: ok
        ? `completedQuantity=${completed}, percentage=${pct}%`
        : `got completed=${completed} pct=${pct} (expected 2 / 40)`,
      data: targetRes.data,
    });
  }

  // ── 5) Employee cannot invent manual % (edit blocked for employee) ─────
  {
    const res = await targets.updateTarget(assignedTargetId, {
      notes: "employee trying to edit",
    });
    const ok = !res.success;
    record({
      id: "employee-cannot-edit",
      actor: "employee",
      title: "Employee cannot edit target (permission gate)",
      ok,
      detail: ok
        ? "correctly forbidden"
        : "UNEXPECTED: employee was allowed to edit target",
    });
  }

  // ── 6) Admin sends warning + employee acknowledges ─────────────────────
  asAdmin();
  let warningId = "";
  {
    const warn = await targets.sendTargetWarning({
      targetId: assignedTargetId,
      employeeId: "emp-003",
      reason: "Agent Demo: pace behind after first day of visits",
      managerNotes: "Please complete at least one visit daily",
      requiredAction: "Finish 2 more visits within 48 hours",
      penaltyType: "performance_note",
      penaltyNote: "Logged by Target User Agent",
    });
    warningId = warn.data.id;
    record({
      id: "send-warning",
      actor: "admin",
      title: "Send performance warning",
      ok: warn.success && Boolean(warningId),
      detail: warn.success
        ? `warning=${warningId}`
        : warn.message ?? "failed",
    });
  }

  asEmployee("emp-003");
  {
    const ack = await targets.acknowledgeTargetWarning(warningId);
    const ok = ack.success && Boolean(ack.data.acknowledgedAt);
    record({
      id: "ack-warning",
      actor: "employee",
      title: "Employee acknowledges warning",
      ok,
      detail: ok
        ? `acknowledgedAt=${ack.data.acknowledgedAt}`
        : ack.message ?? "failed",
    });
  }

  // ── 7) Admin dashboard + delayed center readability ────────────────────
  asAdmin();
  let dashboardSnapshot: unknown = null;
  {
    const dash = await targets.getTargetDashboard();
    const delayed = await targets.getDelayedCenter();
    const list = await targets.getTargets({});
    dashboardSnapshot = dash.data;
    const ok =
      dash.success &&
      delayed.success &&
      list.success &&
      dash.data.total >= 1 &&
      list.data.some((t) => t.id === assignedTargetId);
    record({
      id: "dashboard",
      actor: "admin",
      title: "Dashboard + delayed center load with agent target visible",
      ok,
      detail: ok
        ? `total=${dash.data.total}, completed=${dash.data.completed}, delayedTargets=${delayed.data.delayedTargets.length}, avgScore=${dash.data.averagePerformance}`
        : dash.message ?? delayed.message ?? "failed",
      data: {
        kpis: dash.data,
        delayedCount: delayed.data.delayedTargets.length,
        criticalCount: delayed.data.criticalTargets.length,
      },
    });
  }

  // ── 8) Employee performance page ───────────────────────────────────────
  asEmployee("emp-003");
  {
    const perf = await targets.getEmployeeTargetPerformance("emp-003");
    const ok =
      perf.success &&
      perf.data.targets.some((t) => t.id === assignedTargetId) &&
      perf.data.warnings >= 1;
    record({
      id: "employee-perf",
      actor: "employee",
      title: "Employee performance page shows target + warning",
      ok,
      detail: ok
        ? `score=${perf.data.overallScore}, targets=${perf.data.targets.length}, warnings=${perf.data.warnings}`
        : perf.message ?? "failed",
      data: perf.data,
    });
  }

  // ── 9) Complete remaining tasks → 100% completed ───────────────────────
  {
    const tasksRes = await work.getWorkTasks({ employeeId: "emp-003" });
    const open = tasksRes.data.filter(
      (t) => t.targetId === assignedTargetId && t.status !== "completed"
    );
    for (const task of open) {
      await work.updateWorkTaskStatus(task.id, "completed");
    }
    await new Promise((r) => setTimeout(r, 1000));
    const targetRes = await targets.getTarget(assignedTargetId);
    const ok =
      targetRes.success &&
      targetRes.data?.completedQuantity === 5 &&
      targetRes.data?.metrics?.percentage === 100 &&
      targetRes.data?.status === "completed";
    record({
      id: "full-completion",
      actor: "employee",
      title: "Complete remaining tasks → target reaches 100% / completed",
      ok,
      detail: ok
        ? `status=${targetRes.data?.status}, percentage=${targetRes.data?.metrics?.percentage}%`
        : `status=${targetRes.data?.status} qty=${targetRes.data?.completedQuantity} pct=${targetRes.data?.metrics?.percentage}`,
      data: targetRes.data,
    });
  }

  // ── Persist snapshot for UI inspection helpers ─────────────────────────
  const storage = getStorageAdapter();
  const snapshot = {
    generatedAt: new Date().toISOString(),
    mode: "local",
    failed,
    passed: steps.filter((s) => s.ok).length,
    total: steps.length,
    steps,
    storage: {
      categories: await storage.getItem(StorageKeys.targetCategories),
      types: await storage.getItem(StorageKeys.targetTypes),
      templates: await storage.getItem(StorageKeys.targetTemplates),
      targets: await storage.getItem(StorageKeys.performanceTargets),
      warnings: await storage.getItem(StorageKeys.targetWarnings),
    },
    dashboard: dashboardSnapshot,
    agentTargetId: assignedTargetId,
  };

  const outDir = join(process.cwd(), "docs", "target-agent");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, "latest-snapshot.json");
  const mdPath = join(outDir, "LATEST_REPORT.md");
  writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2), "utf8");
  writeFileSync(mdPath, renderMarkdown(snapshot), "utf8");

  console.log("\n────────────────────────────────────────");
  console.log(`Target User Agent finished: ${snapshot.passed}/${snapshot.total} passed`);
  console.log(`Report : ${mdPath}`);
  console.log(`Snapshot: ${jsonPath}`);
  console.log("────────────────────────────────────────");
  console.log(
    "\nTo see rich demo data in the UI: refresh /targets after Reset Demo Data (seed includes Agent Demo rows)."
  );

  if (failed > 0) process.exitCode = 1;
}

function renderMarkdown(snapshot: {
  generatedAt: string;
  failed: number;
  passed: number;
  total: number;
  steps: StepResult[];
  agentTargetId: string;
  dashboard: unknown;
}): string {
  const lines: string[] = [
    "# Target User Agent — Test Report",
    "",
    `Generated: **${snapshot.generatedAt}**`,
    "",
    `Result: **${snapshot.passed}/${snapshot.total} passed**${snapshot.failed ? ` (${snapshot.failed} failed)` : ""}`,
    "",
    `Agent target id: \`${snapshot.agentTargetId}\``,
    "",
    "## Scenarios (real user flows)",
    "",
    "| # | Actor | Scenario | Result | Detail |",
    "|---|-------|----------|--------|--------|",
  ];
  snapshot.steps.forEach((s, i) => {
    lines.push(
      `| ${i + 1} | ${s.actor} | ${s.title} | ${s.ok ? "✅ PASS" : "❌ FAIL"} | ${s.detail.replace(/\|/g, "/")} |`
    );
  });
  lines.push(
    "",
    "## How to view in the app",
    "",
    "1. Run the app in **local** mode (`NEXT_PUBLIC_DATA_SOURCE=local`).",
    "2. Open **Settings → Reset Demo Data** (or bump seed by reloading after seed update).",
    "3. Go to `/targets` — look for rows titled **Agent Demo — …** plus seeded Sales/Dev/Marketing targets.",
    "4. Complete linked tasks under `/tasks` and watch progress rings update automatically.",
    "",
    "## Dashboard snapshot",
    "",
    "```json",
    JSON.stringify(snapshot.dashboard, null, 2),
    "```",
    ""
  );
  return lines.join("\n");
}

main().catch((err) => {
  console.error("Target User Agent crashed:", err);
  process.exitCode = 1;
});
