#!/usr/bin/env node
/**
 * Production/local-server smoke for ROOTK Systems API.
 * Usage: node scripts/prod-server-smoke.mjs
 * Env: CRM_API_BASE, CRM_AUDIT_EMAIL, CRM_AUDIT_PASSWORD
 */
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const BASE = process.env.CRM_API_BASE || "http://127.0.0.1:3031/api";
const EMAIL =
  process.env.CRM_AUDIT_EMAIL ||
  process.env.PROD_AUDIT_EMAIL ||
  "admin@rootksystems.com";
const PASSWORD = process.env.CRM_AUDIT_PASSWORD || "Rootk@2026";

function httpJson(method, path, { token, body } = {}) {
  const base = BASE.endsWith("/") ? BASE : `${BASE}/`;
  const url = new URL(String(path).replace(/^\//, ""), base);
  const payload = body ? JSON.stringify(body) : null;
  const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = transport(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-Company-Id": "cmp_rootk_001",
          ...(payload
            ? { "Content-Length": Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = { parseError: true, raw: raw.slice(0, 300) };
          }
          resolve({ status: res.statusCode || 0, json });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const login = await httpJson("POST", "/auth/login", {
  body: { email: EMAIL, password: PASSWORD },
});
const token =
  login.json?.data?.tokens?.accessToken ||
  login.json?.data?.accessToken ||
  login.json?.tokens?.accessToken;
check("login", login.status === 200 && !!token, `status=${login.status}`);
if (!token) {
  console.error(login.json);
  process.exit(1);
}

async function get(path) {
  return httpJson("GET", path, { token });
}

const endpoints = [
  ["/auth/me", (r) => r.status === 200 && !!(r.json?.data || r.json)],
  ["/crm/dashboard", (r) => r.status === 200 && !!r.json?.data],
  ["/crm/business-types", (r) => r.status === 200 && Array.isArray(r.json?.data)],
  ["/crm/stages", (r) => r.status === 200 && Array.isArray(r.json?.data)],
  [
    "/crm/leads?page=1&pageSize=5",
    (r) => r.status === 200 && Array.isArray(r.json?.data?.items),
  ],
  ["/crm/activities?page=1&pageSize=10", (r) => r.status === 200],
  ["/crm/feedback?page=1&pageSize=10", (r) => r.status === 200],
  ["/crm/performance", (r) => r.status === 200 && Array.isArray(r.json?.data)],
  ["/crm/reports", (r) => r.status === 200 && !!r.json?.data],
  ["/organic-ads/overview", (r) => r.status === 200 && !!r.json?.data],
  ["/targets/dashboard", (r) => r.status === 200],
  ["/employees", (r) => r.status === 200],
  ["/attendance?date=today", (r) => r.status === 200],
  ["/payroll/dashboard", (r) => r.status === 200],
];

for (const [path, pred] of endpoints) {
  const res = await get(path);
  check(path, pred(res), `status=${res.status}`);
}

// mutation smoke for business type
const name = `__prod_smoke_${Date.now()}__`;
const created = await httpJson("PUT", "/crm/business-types", {
  token,
  body: { name, description: "smoke", active: true, sortOrder: 999 },
});
const id = created.json?.data?.id;
check("create business-type", created.status < 300 && !!id, `status=${created.status}`);
if (id) {
  const del = await httpJson("DELETE", `/crm/business-types/${id}`, { token });
  check("delete business-type", del.status < 300, `status=${del.status}`);
}

const failed = checks.filter((c) => !c.ok).length;
console.log(
  `\nSUMMARY passed=${checks.length - failed} failed=${failed} total=${checks.length}`
);
process.exit(failed ? 1 : 0);
