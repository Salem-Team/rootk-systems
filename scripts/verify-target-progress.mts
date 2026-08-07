/**
 * Lightweight progress-engine check (no test runner required).
 * Run: node --experimental-strip-types scripts/verify-target-progress.mts
 * Or via tsx if available.
 */
import {
  buildTaskTitle,
  computeTargetProgress,
} from "../src/lib/target-progress.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const m = computeTargetProgress({
  quantity: 10,
  completedQuantity: 2,
  startDate: "2026-08-01",
  endDate: "2026-08-20",
  now: new Date("2026-08-06T12:00:00.000Z"),
});
assert(m.percentage === 20, `expected 20%, got ${m.percentage}`);
assert(m.remaining === 8, `expected remaining 8`);

const overdue = computeTargetProgress({
  quantity: 10,
  completedQuantity: 1,
  startDate: "2026-07-01",
  endDate: "2026-07-10",
  now: new Date("2026-08-06T12:00:00.000Z"),
});
assert(overdue.derivedStatus === "delayed", "expected delayed status");
assert(overdue.health === "delayed", "expected delayed health");

assert(
  buildTaskTitle("{name} #{n}", "Calls", 4) === "Calls #4",
  "title template failed"
);

console.log("target-progress ok");
