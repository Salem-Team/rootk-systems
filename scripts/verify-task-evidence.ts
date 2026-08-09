/**
 * Task completion evidence helpers — regression checks.
 * Notes are always mandatory for employee Done; links stay optional unless flagged.
 * Run: npx tsx scripts/verify-task-evidence.ts
 */

import {
  addEvidenceLink,
  completionNeedsEvidenceDialog,
  isValidEvidenceUrl,
  normalizeEvidenceUrl,
  nextTaskStatus,
  parseEvidenceLinksText,
  resolveEvidenceBadgeState,
  taskHasSubmittedEvidence,
  taskRequiresEvidence,
  validateTaskEvidence,
} from "../src/lib/task-evidence";
import type { WorkTask } from "../src/types/work";

let failed = 0;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

function baseTask(overrides: Partial<WorkTask> = {}): WorkTask {
  return {
    id: "task-1",
    title: "Demo",
    description: "",
    status: "in_progress",
    priority: "medium",
    dueDate: "",
    tag: "",
    estimateMin: 0,
    assigneeIds: ["emp-1"],
    subItems: [],
    origin: "assigned",
    requireEvidenceLinks: false,
    requireEvidenceNotes: false,
    evidenceLinks: [],
    evidenceNotes: "",
    assignedAt: "2026-08-01T10:00:00.000Z",
    completedAt: null,
    companyId: "c1",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
    ...overrides,
  };
}

function main() {
  assert(normalizeEvidenceUrl("example.com/x") === "https://example.com/x", "normalize adds https");
  assert(isValidEvidenceUrl("https://github.com/a/b"), "valid https url");
  assert(!isValidEvidenceUrl("not a url"), "reject junk");
  assert(!isValidEvidenceUrl(""), "reject empty");

  const parsed = parseEvidenceLinksText(
    "github.com/pr/1\nhttps://docs.google.com/x\ngithub.com/pr/1\nbad"
  );
  assert(parsed.length === 2, "parse unique valid links only");

  const addDup = addEvidenceLink(["https://a.com"], "https://a.com");
  assert(addDup.error === "duplicate", "detect duplicate link");
  const addOk = addEvidenceLink([], "https://b.com/path");
  assert(!addOk.error && addOk.links.length === 1, "add valid link");

  const off = baseTask();
  assert(taskRequiresEvidence(off), "notes always required before Done");
  assert(resolveEvidenceBadgeState(off) === "required", "badge required while open");
  assert(
    !validateTaskEvidence(off, { links: [], notes: "" }).ok,
    "reject empty notes even when flags off"
  );
  assert(
    validateTaskEvidence(off, { links: [], notes: "Done with notes" }).ok,
    "accept notes-only completion"
  );
  assert(
    completionNeedsEvidenceDialog(off),
    "dialog always needed when moving to completed"
  );

  const linksOnly = baseTask({ requireEvidenceLinks: true });
  assert(taskRequiresEvidence(linksOnly), "links flag still requires evidence");
  assert(
    !validateTaskEvidence(linksOnly, { links: [], notes: "done work" }).ok,
    "reject missing links when required"
  );
  assert(
    !validateTaskEvidence(linksOnly, {
      links: ["https://example.com/pr/1"],
      notes: "",
    }).ok,
    "reject links without notes"
  );
  assert(
    validateTaskEvidence(linksOnly, {
      links: ["https://example.com/pr/1"],
      notes: "Finished the handoff",
    }).ok,
    "accept links + notes proof"
  );
  assert(
    completionNeedsEvidenceDialog(linksOnly),
    "dialog needed for in_progress + required"
  );

  const notesOnly = baseTask({ requireEvidenceNotes: true });
  assert(
    !validateTaskEvidence(notesOnly, { links: ["https://x.com"], notes: "ab" })
      .ok,
    "reject short notes"
  );
  assert(
    validateTaskEvidence(notesOnly, {
      links: [],
      notes: "Finished the handoff",
    }).ok,
    "accept notes-only proof"
  );

  const both = baseTask({
    requireEvidenceLinks: true,
    requireEvidenceNotes: true,
  });
  const bothFail = validateTaskEvidence(both, { links: [], notes: "" });
  assert(!bothFail.ok && bothFail.code === "both", "both missing → both code");

  const submitted = baseTask({
    status: "completed",
    evidenceNotes: "Shipped",
    evidenceLinks: ["https://example.com"],
    completedAt: "2026-08-01T12:00:00.000Z",
  });
  assert(taskHasSubmittedEvidence(submitted), "detect submitted evidence");
  assert(
    resolveEvidenceBadgeState(submitted) === "submitted",
    "badge submitted when done with proof"
  );

  assert(nextTaskStatus("todo") === "in_progress", "todo → in_progress");
  assert(nextTaskStatus("in_progress") === "completed", "in_progress → completed");
  assert(nextTaskStatus("completed") === "todo", "completed → todo");

  const todo = baseTask({ status: "todo" });
  assert(
    !completionNeedsEvidenceDialog(todo),
    "no dialog when next status is in_progress"
  );

  if (failed > 0) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll task-evidence checks passed.");
}

main();
