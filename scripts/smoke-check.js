/**
 * Lightweight smoke checks (no DB / browser / path aliases required).
 * Run: npm run smoke
 */

const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`OK  : ${msg}`);
  }
}

function fileContains(rel, snippet) {
  const abs = join(process.cwd(), rel);
  if (!existsSync(abs)) return false;
  return readFileSync(abs, "utf8").includes(snippet);
}

function main() {
  const root = process.cwd();

  for (const f of [
    "src/api/routes.ts",
    "src/api/http.ts",
    "src/api/contracts.ts",
    "src/lib/api-adapters.ts",
    "src/lib/http-client.ts",
    "src/services/auth.service.ts",
    "src/services/employees.service.ts",
    "src/components/providers/api-bootstrap-provider.tsx",
    "docs/BACKEND_INTEGRATION.md",
    "docs/prisma/schema.prisma",
    "backend/prisma/schema.prisma",
    "backend/src/main.ts",
    "backend/src/app.module.ts",
    "backend/docker-compose.yml",
    "backend/prisma/seed.ts",
  ]) {
    assert(existsSync(join(root, f)), `exists ${f}`);
  }

  assert(
    fileContains("src/services/employees.service.ts", "isApiMode()"),
    "employees service dual-mode"
  );
  assert(
    fileContains("src/services/work.service.ts", "isApiMode()"),
    "work service dual-mode"
  );
  assert(
    fileContains("src/services/payroll.service.ts", "isApiMode()"),
    "payroll service dual-mode"
  );
  assert(
    fileContains(
      "src/components/providers/api-bootstrap-provider.tsx",
      "hydrateCurrentUser"
    ),
    "bootstrap hydrates /auth/me"
  );

  assert(fileContains("src/api/routes.ts", "profileExtras"), "route profile-extras");
  assert(fileContains("src/api/routes.ts", "health"), "route health");
  assert(fileContains("src/api/http.ts", "getList"), "api.getList helper");
  assert(fileContains("src/api/contracts.ts", "unwrapList"), "unwrapList helper");

  // Notification system (in-app chime + domain producers)
  for (const f of [
    "src/lib/notification-sound.ts",
    "src/lib/preference-notifications.ts",
    "src/lib/notification-policy.ts",
    "src/lib/work-time.ts",
    "src/lib/wfh-policy.ts",
    "src/lib/duration-format.ts",
    "src/lib/payroll/engine.ts",
    "src/lib/payroll/charge.ts",
    "src/lib/work-deduction-policy.ts",
    "src/components/admin/work-deduction-rules-panel.tsx",
    "src/components/admin/deduction-charge-editor.tsx",
    "src/components/providers/notification-audio-provider.tsx",
    "src/services/notification.service.ts",
    "src/hooks/use-notifications.ts",
  ]) {
    assert(existsSync(join(root, f)), `exists ${f}`);
  }
  assert(
    fileContains("src/lib/notification-sound.ts", "playNotificationChime"),
    "notification chime export"
  );
  assert(
    fileContains(
      "src/components/providers/app-providers.tsx",
      "NotificationAudioProvider"
    ),
    "app mounts notification audio"
  );
  assert(
    fileContains("src/services/notification.service.ts", "companyAllowsCategory"),
    "notifications gated by company policy"
  );
  assert(
    fileContains("src/services/notification.service.ts", "companyAllowsSound") ||
      fileContains("src/lib/events.ts", "playSound"),
    "notification update can request sound"
  );
  assert(
    fileContains("backend/src/auth/auth.service.ts", "issueTokens") &&
      fileContains("backend/src/auth/auth.service.ts", "refreshToken"),
    "auth refresh tokens"
  );
  assert(
    fileContains("backend/src/lib/work-time.ts", "settleWorkDay"),
    "backend work-time settle"
  );
  assert(
    fileContains("backend/prisma/schema.prisma", "grossMinutes"),
    "attendance work-time columns"
  );
  assert(
    fileContains("src/services/attendance.service.ts", "settleWorkDay"),
    "attendance uses settleWorkDay"
  );
  assert(
    fileContains("src/services/leave.service.ts", "notifyLeaveCancelled"),
    "leave cancel notifies"
  );
  assert(
    fileContains("src/services/attendance.service.ts", "notifyEarlyLeave"),
    "early leave notifies"
  );
  assert(
    fileContains("src/services/employees.service.ts", "notifyEmployeeCreated"),
    "employee create notifies"
  );
  assert(
    fileContains("src/services/payroll.service.ts", "notifyPayrollAdvanced"),
    "payroll advance notifies"
  );
  assert(
    fileContains("src/services/work.service.ts", "notifyTaskCompleted"),
    "task complete notifies"
  );
  assert(
    fileContains("src/types/preferences.ts", "sound: boolean"),
    "prefs include sound toggle"
  );
  assert(
    fileContains("src/i18n/locales/en.ts", "soundNotif") &&
      fileContains("src/i18n/locales/ar.ts", "soundNotif"),
    "sound preference i18n"
  );
  assert(
    fileContains("src/i18n/locales/en.ts", "earlyLeaveTitle") &&
      fileContains("src/i18n/locales/ar.ts", "earlyLeaveTitle"),
    "early leave i18n"
  );

  for (const mod of [
    "employees",
    "attendance",
    "leave",
    "schedule",
    "settings",
    "notifications",
    "users",
    "work",
    "org",
    "payroll",
    "dashboard",
    "auth",
    "health",
  ]) {
    assert(existsSync(join(root, `backend/src/${mod}`)), `backend module ${mod}`);
  }

  assert(
    fileContains("backend/src/employees/employees.service.ts", "prisma.employee"),
    "employees Prisma queries"
  );
  assert(
    fileContains("backend/src/auth/auth.service.ts", "prisma.user"),
    "auth Prisma users"
  );
  assert(
    fileContains("backend/prisma/seed.ts", "cmp_rootk_001") ||
      fileContains("backend/prisma/seed.ts", "DEFAULT_COMPANY_ID"),
    "seed company id"
  );

  assert(
    fileContains("src/lib/geo.ts", "parseGoogleMapsUrl") &&
      fileContains("src/lib/geo.ts", "findMatchingOffice"),
    "geo helpers (Maps URL + geofence)"
  );
  assert(
    fileContains("backend/src/lib/geo.ts", "resolveGoogleMapsUrl"),
    "backend Maps URL resolve"
  );
  assert(
    fileContains("backend/prisma/schema.prisma", "radiusMeters"),
    "office geofence columns"
  );
  assert(
    fileContains("src/services/attendance.service.ts", "assertOfficeGeofence") ||
      fileContains("src/services/attendance.service.ts", "Outside office geofence"),
    "attendance enforces office geofence"
  );
  assert(
    fileContains("src/api/routes.ts", "resolveMapsUrl"),
    "route resolve-maps-url"
  );
  assert(
    fileContains("src/components/admin/shifts-panel.tsx", "onCreate") ||
      fileContains("src/components/admin/shifts-panel.tsx", "addShift"),
    "shifts admin CRUD UI"
  );
  assert(
    fileContains("src/services/leave.service.ts", "applyApprovedLeaveLocal") ||
      fileContains("src/services/leave.service.ts", "approvalLeave"),
    "leave approval rule wiring"
  );

  // Task completion evidence (opt-in per assignment)
  assert(
    existsSync(join(root, "src/lib/task-evidence.ts")),
    "exists src/lib/task-evidence.ts"
  );
  assert(
    fileContains("backend/prisma/schema.prisma", "requireEvidenceLinks") &&
      fileContains("backend/prisma/schema.prisma", "evidenceNotes"),
    "prisma WorkTask evidence columns"
  );
  assert(
    fileContains("docs/prisma/schema.prisma", "requireEvidenceLinks"),
    "docs prisma evidence columns"
  );
  assert(
    fileContains("src/services/work.service.ts", "taskRequiresEvidence") &&
      fileContains("src/services/work.service.ts", "validateTaskEvidence"),
    "work service enforces completion evidence"
  );
  assert(
    fileContains(
      "backend/src/work/work.service.ts",
      "assertCompletionEvidence"
    ),
    "backend enforces completion evidence"
  );
  assert(
    fileContains(
      "src/components/work/task-completion-evidence-dialog.tsx",
      "TaskCompletionEvidenceDialog"
    ),
    "evidence completion dialog"
  );
  assert(
    fileContains(
      "src/components/work/admin-work-assign-panel.tsx",
      "requireEvidenceLinks"
    ),
    "admin opt-in evidence toggles"
  );
  assert(
    fileContains("src/components/ui/dialog.tsx", "max-h-[min(92dvh") ||
      fileContains("src/components/ui/dialog.tsx", "92dvh"),
    "dialog responsive max-height"
  );

  assert(
    fileContains("src/i18n/locales/ar.ts", "deductionRules"),
    "deduction rules i18n ar"
  );
  assert(
    fileContains("src/i18n/locales/en.ts", "deductionRules"),
    "deduction rules i18n en"
  );
  assert(
    fileContains("backend/src/lib/payroll-charge.ts", "resolveAbsenceCharge"),
    "backend payroll charge resolver"
  );
  assert(
    fileContains(
      "src/components/admin/company-admin-workspace.tsx",
      "WorkDeductionRulesPanel"
    ),
    "work policies mounts deduction panel"
  );

  assert(fileContains("tsconfig.json", '"backend"'), "tsconfig excludes backend");
  assert(fileContains("eslint.config.mjs", "backend/**"), "eslint ignores backend");
  assert(fileContains("eslint.config.mjs", "scripts/**"), "eslint ignores scripts");

  if (failed > 0) {
    console.error(`\nSmoke check failed: ${failed} assertion(s)`);
    process.exit(1);
  }
  console.log("\nSmoke check passed.");
}

main();
