/**
 * Work task visibility — assigned, team lead (reports), project lead only.
 * Run: npx tsx scripts/verify-work-task-scope.ts
 */
import { workTaskListScope } from "../backend/src/work/work-access";
import { AppRole } from "../backend/src/common/roles";
import type { Actor } from "../backend/src/work/work-mappers";

function actor(
  partial: Partial<Actor> & Pick<Actor, "role" | "permissions">
): Actor {
  return {
    userId: "u1",
    employeeId: "e1",
    ...partial,
  };
}

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK:", msg);
  }
}

assert(
  workTaskListScope(actor({ role: AppRole.admin, permissions: [] })) === "all",
  "admin → all"
);
assert(
  workTaskListScope(
    actor({
      role: AppRole.employee,
      permissions: ["tasks.viewAll"],
    })
  ) === "all",
  "tasks.viewAll → all"
);
assert(
  workTaskListScope(
    actor({
      role: AppRole.employee,
      permissions: ["team.viewAll", "tasks.viewOwn"],
    })
  ) === "own",
  "team.viewAll alone must NOT unlock all tasks"
);
assert(
  workTaskListScope(
    actor({
      role: AppRole.employee,
      permissions: ["tasks.assign", "tasks.viewOwn"],
    })
  ) === "managed",
  "tasks.assign → managed (team lead)"
);
assert(
  workTaskListScope(
    actor({
      role: AppRole.employee,
      permissions: ["tasks.viewTeam"],
    })
  ) === "managed",
  "tasks.viewTeam → managed"
);
assert(
  workTaskListScope(
    actor({
      role: AppRole.employee,
      permissions: ["tasks.viewOwn"],
    })
  ) === "own",
  "viewOwn only → own"
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nverify-work-task-scope: OK");
