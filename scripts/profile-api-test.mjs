#!/usr/bin/env node
/**
 * Full API test for signed-in profile update.
 * Usage: node scripts/profile-api-test.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://127.0.0.1:3011/api";

let failed = 0;

function ok(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`OK  : ${msg}`);
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function login(email, password) {
  const res = await req("POST", "/auth/login", {
    body: { email, password },
  });
  const data = res.json?.data ?? res.json;
  return {
    status: res.status,
    token: data?.tokens?.accessToken ?? null,
    user: data?.user ?? null,
  };
}

async function runAccount(label, email, password) {
  console.log(`\n── ${label} (${email}) ──`);
  const auth = await login(email, password);
  ok(auth.status === 200 && !!auth.token, `${label}: login`);
  if (!auth.token) return;

  const unauthorized = await req("POST", "/auth/profile", {
    body: { firstName: "X" },
  });
  ok(unauthorized.status === 401, `${label}: profile without token → 401`);

  const patchGone = await req("PATCH", "/auth/me", {
    token: auth.token,
    body: { firstName: "X" },
  });
  ok(patchGone.status === 404, `${label}: legacy PATCH /auth/me → 404`);

  const emptyName = await req("POST", "/auth/profile", {
    token: auth.token,
    body: { firstName: "   " },
  });
  ok(
    emptyName.status === 400 || emptyName.json?.success === false,
    `${label}: empty firstName rejected`
  );

  const stamp = Date.now().toString().slice(-4);
  const firstName = label === "admin" ? `Nour${stamp}` : `Salem${stamp}`;
  const lastName = label === "admin" ? "Al-Admin" : "Employee";
  const phone = `+20 100 999 ${stamp}`;

  const updated = await req("POST", "/auth/profile", {
    token: auth.token,
    body: { firstName, lastName, phone },
  });
  const payload = updated.json?.data ?? updated.json;
  ok(updated.status === 200 && updated.json?.success !== false, `${label}: profile save 200`);
  ok(payload?.user?.firstName === firstName, `${label}: firstName persisted`);
  ok(payload?.user?.lastName === lastName, `${label}: lastName persisted`);
  ok(
    payload?.user?.displayName === `${firstName} ${lastName}`,
    `${label}: displayName composed`
  );
  ok(payload?.phone === phone, `${label}: phone persisted`);

  const me = await req("GET", "/auth/me", { token: auth.token });
  const meUser = me.json?.data ?? me.json;
  ok(me.status === 200, `${label}: GET /auth/me`);
  ok(meUser?.firstName === firstName, `${label}: /me reflects firstName`);
  ok(meUser?.lastName === lastName, `${label}: /me reflects lastName`);

  if (meUser?.employeeId) {
    const emp = await req("GET", `/employees/${meUser.employeeId}`, {
      token: auth.token,
    });
    const empRow = emp.json?.data ?? emp.json;
    ok(emp.status === 200, `${label}: linked employee readable`);
    ok(
      empRow?.name === `${firstName} ${lastName}`,
      `${label}: employee.name synced`
    );
    ok(empRow?.phone === phone, `${label}: employee.phone synced`);
  }

  // Restore stable demo names for the shared seed accounts.
  const restore =
    label === "admin"
      ? {
          firstName: "Nour",
          lastName: "Al-Admin",
          phone: "+20 100 000 0000",
        }
      : {
          firstName: "Salem",
          lastName: "Employee",
          phone: "+20 100 000 0001",
        };
  const restored = await req("POST", "/auth/profile", {
    token: auth.token,
    body: restore,
  });
  ok(restored.status === 200, `${label}: restore seed profile`);
}

async function main() {
  console.log(`Profile API test → ${BASE}`);
  const health = await req("GET", "/health/live");
  ok(health.status === 200, "health/live");

  await runAccount("admin", "admin@rootk.systems", "Rootk@2026");
  await runAccount("employee", "employee@rootk.systems", "Rootk@2026");

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll profile API checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
