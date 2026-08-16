/**
 * User permissions — catalog, i18n, defaults, overrides, data-scope master switch.
 * Run: npx tsx scripts/verify-permissions.ts
 */

import { ar } from "../src/i18n/locales/ar";
import { en } from "../src/i18n/locales/en";
import { canCrm } from "../src/lib/crm-policies";
import { canOrganicAds } from "../src/lib/organic-ads-policies";
import { canTarget } from "../src/lib/target-policies";
import {
  ALL_PERMISSION_IDS,
  CRM_CAPABILITY_TO_PERMISSION,
  EMPLOYEE_DEFAULT_PERMISSION_IDS,
  ORGANIC_ADS_CAPABILITY_TO_PERMISSION,
  PERMISSION_CATALOG,
  PERMISSION_MODULES,
  ROUTE_PERMISSIONS,
  TARGET_CAPABILITY_TO_PERMISSION,
  OTHER_USERS_DATA_PERMISSION_IDS,
  withPermissionGrantSideEffects,
  canViewOthersInModule,
  isPermissionId,
  overridesFromEffective,
  permissionsForRole,
  resolveEffectivePermissions,
} from "../src/constants/permissions";
import { PERMISSION_CATALOG as BE_CATALOG } from "../backend/src/common/permissions-catalog";

let failed = 0;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`OK  : ${msg}`);
  }
}

function lookup(dict: unknown, path: string): unknown {
  let current: unknown = dict;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function main() {
  const ids = PERMISSION_CATALOG.map((item) => item.id);
  assert(ids.length === new Set(ids).size, "catalog ids are unique");
  assert(ids.length === ALL_PERMISSION_IDS.length, "ALL_PERMISSION_IDS matches catalog");
  assert(ids.length >= 90, `catalog is detailed (${ids.length} permissions)`);

  const beIds = BE_CATALOG.map((item) => item.id);
  assert(
    [...ids].sort().join("|") === [...beIds].sort().join("|"),
    "frontend and backend catalogs are in sync"
  );
  for (const item of PERMISSION_CATALOG) {
    const be = BE_CATALOG.find((row) => row.id === item.id);
    assert(
      be?.employeeDefault === item.employeeDefault && be?.module === item.module,
      `catalog flags match for ${item.id}`
    );
  }

  for (const mod of PERMISSION_MODULES) {
    const label = lookup(en, `permissions.modules.${mod}`);
    const labelAr = lookup(ar, `permissions.modules.${mod}`);
    assert(typeof label === "string" && label.length > 0, `en module label ${mod}`);
    assert(typeof labelAr === "string" && labelAr.length > 0, `ar module label ${mod}`);
  }

  for (const item of PERMISSION_CATALOG) {
    const [mod, name] = item.id.split(".");
    const labelPath = `permissions.items.${mod}.${name}`;
    const descPath = `permissions.items.${mod}.${name}Desc`;
    const enLabel = lookup(en, labelPath);
    const enDesc = lookup(en, descPath);
    const arLabel = lookup(ar, labelPath);
    const arDesc = lookup(ar, descPath);
    assert(typeof enLabel === "string" && !String(enLabel).includes("."), `en label ${item.id}`);
    assert(typeof enDesc === "string" && String(enDesc).length > 8, `en desc ${item.id}`);
    assert(typeof arLabel === "string" && String(arLabel).length > 0, `ar label ${item.id}`);
    assert(typeof arDesc === "string" && String(arDesc).length > 0, `ar desc ${item.id}`);
    assert(isPermissionId(item.id), `isPermissionId ${item.id}`);
  }

  const admin = permissionsForRole("admin");
  const employee = permissionsForRole("employee");
  assert(admin.length === ALL_PERMISSION_IDS.length, "admin defaults = full catalog");
  assert(employee.length === EMPLOYEE_DEFAULT_PERMISSION_IDS.length, "employee defaults match flags");
  assert(employee.includes("crm.viewLeads"), "employee can view leads");
  assert(!employee.includes("crm.assignLeads"), "employee cannot assign leads by default");
  assert(!employee.includes("employees.view"), "employee cannot open employees by default");
  assert(!employee.includes("dataAccess.viewOtherUsers"), "employee cannot see others' data by default");
  assert(employee.includes("attendance.viewOwn"), "employee can view own attendance");
  assert(employee.includes("payroll.viewOwnPayslip"), "employee can view own payslip");
  assert(!employee.includes("settings.managePermissions"), "employee cannot manage permissions by default");

  const granted = resolveEffectivePermissions("employee", [
    { permissionId: "employees.view", granted: true },
    { permissionId: "crm.viewLeads", granted: false },
  ]);
  assert(granted.includes("employees.view"), "override can grant employees.view");
  assert(!granted.includes("crm.viewLeads"), "override can deny crm.viewLeads");
  assert(granted.includes("attendance.viewOwn"), "unrelated employee defaults stay");

  const protectedSet = resolveEffectivePermissions(
    "employee",
    [{ permissionId: "crm.viewLeads", granted: false }],
    { protectedAdmin: true }
  );
  assert(
    protectedSet.length === ALL_PERMISSION_IDS.length,
    "protected admin ignores denies"
  );

  const compact = overridesFromEffective("employee", granted);
  const roundTrip = resolveEffectivePermissions("employee", compact);
  assert(
    roundTrip.slice().sort().join() === granted.slice().sort().join(),
    "overridesFromEffective round-trips"
  );
  assert(
    compact.every((row) => row.permissionId !== "attendance.viewOwn"),
    "sparse overrides omit unchanged defaults"
  );

  const blocked = canViewOthersInModule(
    ["crm.viewOthersLeads", "attendance.viewAll"],
    "crm.viewOthersLeads",
    "attendance.viewTeam"
  );
  assert(blocked.all, "crm.viewOthersLeads works without the master switch");

  const masterOnly = canViewOthersInModule(
    ["dataAccess.viewOtherUsers"],
    "crm.viewOthersLeads"
  );
  assert(
    !masterOnly.all,
    "master switch alone does not unlock CRM without crm.viewOthersLeads"
  );

  const allowed = canViewOthersInModule(
    [
      "dataAccess.viewOtherUsers",
      "crm.viewOthersLeads",
      "attendance.viewTeam",
    ],
    "crm.viewOthersLeads",
    "attendance.viewTeam"
  );
  assert(allowed.all, "master + view others leads → all");

  const teamOnly = canViewOthersInModule(
    ["attendance.viewTeam"],
    "attendance.viewAll",
    "attendance.viewTeam"
  );
  assert(!teamOnly.all && teamOnly.team, "view team without view all");

  assert(canCrm("admin", "assign"), "role fallback: admin can assign");
  assert(!canCrm("employee", "assign"), "role fallback: employee cannot assign");
  assert(canCrm("employee", "view"), "role fallback: employee can view CRM");
  assert(
    canCrm("employee", "assign", ["crm.assignLeads"]),
    "explicit grants override employee role"
  );
  assert(
    !canCrm("admin", "assign", ["crm.viewLeads"]),
    "explicit set can deny admin assign"
  );

  assert(canTarget("admin", "delete"), "admin can delete targets");
  assert(!canTarget("employee", "delete"), "employee cannot delete targets");
  assert(canTarget("employee", "view_delayed"), "employee can view delayed");

  assert(canOrganicAds("admin", "view_team"), "admin can view team ads");
  assert(!canOrganicAds("employee", "view_team"), "employee cannot view team ads");
  assert(canOrganicAds("employee", "create"), "employee can create ads");
  assert(
    canOrganicAds("employee", "view_team", ["organicAds.viewTeam"]),
    "view_team capability can be granted without the master switch"
  );
  assert(
    canViewOthersInModule(
      ["organicAds.viewTeam", "organicAds.viewAll"],
      "organicAds.viewAll",
      "organicAds.viewTeam"
    ).all,
    "ads viewAll without master switch still exposes others' ads"
  );

  const grantedOthers = withPermissionGrantSideEffects(
    ["crm.viewLeads"],
    "crm.viewOthersLeads",
    true
  );
  assert(
    grantedOthers.has("dataAccess.viewOtherUsers") &&
      grantedOthers.has("crm.viewLeads"),
    "granting view others leads also turns on the master switch"
  );
  assert(
    OTHER_USERS_DATA_PERMISSION_IDS.includes("crm.viewOthersLeads"),
    "other-users list is derived from the catalog and includes CRM"
  );
  const empGranted = resolveEffectivePermissions("employee", [
    { permissionId: "crm.viewOthersLeads", granted: true },
  ]);
  assert(
    canViewOthersInModule(
      empGranted,
      "crm.viewOthersLeads",
      undefined,
      "employee"
    ).all,
    "employee role + crm.viewOthersLeads grant can see other leads"
  );
  assert(
    !canViewOthersInModule(
      resolveEffectivePermissions("employee", []),
      "crm.viewOthersLeads",
      undefined,
      "employee"
    ).all,
    "employee without grant still scoped to own leads"
  );

  for (const cap of Object.keys(CRM_CAPABILITY_TO_PERMISSION)) {
    assert(
      isPermissionId(CRM_CAPABILITY_TO_PERMISSION[cap as keyof typeof CRM_CAPABILITY_TO_PERMISSION]),
      `CRM cap map ${cap}`
    );
  }
  for (const cap of Object.keys(TARGET_CAPABILITY_TO_PERMISSION)) {
    assert(
      isPermissionId(
        TARGET_CAPABILITY_TO_PERMISSION[cap as keyof typeof TARGET_CAPABILITY_TO_PERMISSION]
      ),
      `target cap map ${cap}`
    );
  }
  for (const cap of Object.keys(ORGANIC_ADS_CAPABILITY_TO_PERMISSION)) {
    assert(
      isPermissionId(
        ORGANIC_ADS_CAPABILITY_TO_PERMISSION[
          cap as keyof typeof ORGANIC_ADS_CAPABILITY_TO_PERMISSION
        ]
      ),
      `ads cap map ${cap}`
    );
  }

  for (const route of ROUTE_PERMISSIONS) {
    assert(route.prefix.startsWith("/"), `route prefix ${route.prefix}`);
    assert(
      route.anyOf.every((id) => isPermissionId(id)),
      `route ${route.prefix} permissions exist`
    );
  }

  const uiKeys = [
    "permissions.nav",
    "permissions.title",
    "permissions.deniedTitle",
    "admin.navPermissions",
  ] as const;
  for (const key of uiKeys) {
    assert(typeof lookup(en, key) === "string", `en ${key}`);
    assert(typeof lookup(ar, key) === "string", `ar ${key}`);
  }

  if (failed) {
    console.error(`\n${failed} permission check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll permission checks passed (${ids.length} actions).`);
}

main();
