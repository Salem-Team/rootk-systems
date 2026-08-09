#!/usr/bin/env node
/**
 * Smoke-audit CRM Nest endpoints used by every hub tab.
 * Usage: node scripts/crm-api-audit.mjs
 */
import { request } from "node:http";

const BASE = process.env.CRM_API_BASE || "http://localhost:3011/api";
const EMAIL = process.env.CRM_AUDIT_EMAIL || "admin@rootk.systems";
const PASSWORD = process.env.CRM_AUDIT_PASSWORD || "Rootk@2026";

function httpJson(method, path, { token, body } = {}) {
  // Absolute `/path` would drop the `/api` prefix from BASE — use relative join.
  const base = BASE.endsWith("/") ? BASE : `${BASE}/`;
  const url = new URL(String(path).replace(/^\//, ""), base);
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = request(
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
            json = { parseError: true, raw };
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

function shape(data) {
  if (Array.isArray(data)) return `list[${data.length}]`;
  if (data && typeof data === "object") {
    return `dict{${Object.keys(data).sort().slice(0, 12).join(",")}}`;
  }
  return typeof data;
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
if (!token) {
  console.error("Login failed", login.status, login.json);
  process.exit(1);
}

async function get(path) {
  return httpJson("GET", path, { token });
}
async function send(method, path, body) {
  return httpJson(method, path, { token, body });
}

const dash = await get("/crm/dashboard");
const d = dash.json?.data;
check("dashboard", dash.status === 200 && !!d && typeof d === "object", shape(d));
for (const key of [
  "kpis",
  "stageCards",
  "leadsByStage",
  "leadsTrend",
  "conversionTrend",
  "feedbackReasons",
  "salesPerformance",
  "needsAttention",
  "insights",
]) {
  const val = d?.[key];
  const ok = key === "kpis" ? !!val && typeof val === "object" : Array.isArray(val);
  check(`dashboard.${key}`, ok, typeof val);
}

const stages = await get("/crm/stages");
check("stages list", stages.status === 200 && Array.isArray(stages.json?.data), shape(stages.json?.data));

const ftypes = await get("/crm/feedback-types");
check("feedback-types", ftypes.status === 200 && Array.isArray(ftypes.json?.data), shape(ftypes.json?.data));

const btypes = await get("/crm/business-types");
check(
  "business-types",
  btypes.status === 200 && Array.isArray(btypes.json?.data),
  shape(btypes.json?.data)
);

const leads = await get("/crm/leads?page=1&pageSize=20");
const ld = leads.json?.data;
check(
  "leads page",
  leads.status === 200 && !!ld && Array.isArray(ld.items),
  shape(ld)
);

const acts = await get("/crm/activities?page=1&pageSize=50");
check("activities array", acts.status === 200 && Array.isArray(acts.json?.data), shape(acts.json?.data));

const fbs = await get("/crm/feedback?page=1&pageSize=50");
check("feedback array", fbs.status === 200 && Array.isArray(fbs.json?.data), shape(fbs.json?.data));

const perf = await get("/crm/performance");
check("performance array", perf.status === 200 && Array.isArray(perf.json?.data), shape(perf.json?.data));

const reports = await get("/crm/reports");
check("reports", reports.status === 200 && !!reports.json?.data, shape(reports.json?.data));

const leadId = ld?.items?.[0]?.id;
if (leadId) {
  const one = await get(`/crm/leads/${leadId}`);
  check("lead detail", one.status === 200 && !!one.json?.data, shape(one.json?.data));
  const tl = await get(`/crm/leads/${leadId}/timeline`);
  check("timeline array", tl.status === 200 && Array.isArray(tl.json?.data), shape(tl.json?.data));
} else {
  check("lead detail", false, "no leads");
  check("timeline array", false, "no leads");
}

const empId = perf.json?.data?.[0]?.employeeId;
if (empId) {
  const profile = await get(`/crm/performance/${empId}`);
  const p = profile.json?.data;
  check("sales profile", profile.status === 200 && !!p, shape(p));
  check("profile.overview", !!p?.overview && typeof p.overview === "object");
  check("profile.pipeline", Array.isArray(p?.pipeline));
  check("profile.recentActivities", Array.isArray(p?.recentActivities));
  check("profile.feedback", Array.isArray(p?.feedback));
} else {
  check("sales profile", true, "skipped (empty performance)");
}

// Mutation smoke
const stageName = `__crm_audit_${Date.now()}__`;
const createdStage = await send("PUT", "/crm/stages", {
  name: stageName,
  description: "audit",
  color: "#082868",
  category: "open",
  active: true,
});
const stageId = createdStage.json?.data?.id;
check("create stage", createdStage.status === 200 && !!stageId, shape(createdStage.json?.data));

const openStage =
  (stages.json?.data || []).find((s) => s.active && s.category === "open") ||
  (stageId ? { id: stageId } : null);

let auditLeadId = null;
if (openStage?.id) {
  const createdLead = await send("POST", "/crm/leads", {
    name: "Audit Lead",
    phone: "+20 100 000 0099",
    email: "audit@example.com",
    source: "website",
    stageId: openStage.id,
    status: "active",
    nextAction: "call",
  });
  auditLeadId = createdLead.json?.data?.id || null;
  check(
    "create lead",
    createdLead.status >= 200 &&
      createdLead.status < 300 &&
      !!auditLeadId,
    `${createdLead.status} ${createdLead.json?.message || ""}`
  );
  if (auditLeadId) {
    const act = await send("POST", `/crm/leads/${auditLeadId}/activities`, {
      type: "note",
      title: "Audit note",
      description: "ok",
    });
    check(
      "create activity",
      act.status >= 200 && act.status < 300 && !!act.json?.data,
      shape(act.json?.data)
    );
    const ftId = ftypes.json?.data?.[0]?.id;
    if (ftId) {
      const fb = await send("POST", `/crm/leads/${auditLeadId}/feedback`, {
        feedbackTypeId: ftId,
        customerFeedback: "audit",
        nextAction: "follow_up",
      });
      check(
        "create feedback",
        fb.status >= 200 && fb.status < 300 && !!fb.json?.data,
        `${fb.status} ${fb.json?.message || ""}`
      );
    }
    await send("DELETE", `/crm/leads/${auditLeadId}`);
  }
} else {
  check("create lead", false, "no open stage");
}

if (stageId) {
  const del = await send("DELETE", `/crm/stages/${stageId}`);
  check("delete stage", del.status === 200, String(del.status));
}

const failed = checks.filter((c) => !c.ok);
console.log(
  `\nSUMMARY passed=${checks.length - failed.length} failed=${failed.length} total=${checks.length}`
);
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
  process.exit(1);
}
