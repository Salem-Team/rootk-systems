#!/usr/bin/env node
/**
 * Single-owner local restart for ROOTK web/api on 3010/3011.
 *
 * Root cause this prevents: multiple `next dev` / PM2-via-npm processes
 * racing on the same `.next` cache → ENOENT on `_buildManifest.js.tmp.*`
 * → bare "Internal Server Error" on every route.
 *
 * Usage:
 *   node scripts/local-dev-up.mjs            # restart web (clean .next)
 *   node scripts/local-dev-up.mjs --all      # restart api + web
 *   node scripts/local-dev-up.mjs --no-clean # keep .next
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const logsDir = "/tmp/rootk-dev-logs";
const ecosystem = path.join(root, "ecosystem.local.config.cjs");

const args = new Set(process.argv.slice(2));
const restartAll = args.has("--all");
const noClean = args.has("--no-clean");

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (res.stdout?.trim()) process.stdout.write(res.stdout);
  if (res.stderr?.trim()) process.stderr.write(res.stderr);
  return res.status ?? 1;
}

function freePort(port) {
  // Ports 3010/3011 are reserved for this repo locally — free whatever holds them.
  const res = spawnSync("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
  });
  const pids = (res.stdout || "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const pid of pids) {
    const ps = spawnSync("ps", ["-p", pid, "-o", "command="], {
      encoding: "utf8",
    });
    const cmd = (ps.stdout || "").trim();
    console.log(`kill pid ${pid} on :${port} — ${cmd || "(unknown)"}`);
    spawnSync("kill", ["-9", pid]);
  }
}

function pm2Delete(name) {
  spawnSync("pm2", ["delete", name], { encoding: "utf8" });
}

mkdirSync(logsDir, { recursive: true });
// Drop stale ENOENT noise from previous crashed Next processes
for (const f of ["web-3010.err.log", "web-3010.log", "api-3011.err.log"]) {
  writeFileSync(path.join(logsDir, f), "");
}

if (!existsSync(ecosystem)) {
  console.error(`missing ${ecosystem}`);
  process.exit(1);
}

const targets = restartAll
  ? ["rootk-api-3011", "rootk-web-3010"]
  : ["rootk-web-3010"];

console.log(`▶ stop ${targets.join(", ")}`);
for (const name of targets) pm2Delete(name);

if (targets.includes("rootk-web-3010")) freePort(3010);
if (targets.includes("rootk-api-3011")) freePort(3011);

// Drop any orphan next child left after pm2 delete
freePort(3010);

if (targets.includes("rootk-api-3011")) {
  console.log("▶ prisma migrate deploy (keep DB schema in sync)");
  const mig = run("npx", ["prisma", "migrate", "deploy"], {
    cwd: path.join(root, "backend"),
  });
  if (mig !== 0) {
    console.error("prisma migrate deploy failed");
    process.exit(mig);
  }

  // PM2 runs compiled dist/main.js — rebuild so new routes are never stale.
  console.log("▶ nest build (refresh backend/dist for PM2)");
  const apiBuild = run("npm", ["run", "build"], {
    cwd: path.join(root, "backend"),
  });
  if (apiBuild !== 0) {
    console.error("backend nest build failed");
    process.exit(apiBuild);
  }
}

if (!noClean && targets.includes("rootk-web-3010")) {
  const nextDir = path.join(root, ".next");
  if (existsSync(nextDir)) {
    console.log("▶ rm -rf .next (corrupt cache / raced manifests)");
    rmSync(nextDir, { recursive: true, force: true });
  }
}

console.log(`▶ pm2 start ${path.basename(ecosystem)} --only ${targets.join(",")}`);
const startStatus = run("pm2", [
  "start",
  ecosystem,
  "--only",
  targets.join(","),
]);
if (startStatus !== 0) process.exit(startStatus);

run("pm2", ["save"]);

// Wait for Ready
const deadline = Date.now() + 45_000;
let webOk = false;
while (Date.now() < deadline) {
  const curl = spawnSync(
    "curl",
    ["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://127.0.0.1:3010/login"],
    { encoding: "utf8" }
  );
  const code = (curl.stdout || "").trim();
  if (code === "200" || code === "307" || code === "308") {
    webOk = true;
    break;
  }
  spawnSync("sleep", ["1"]);
}

const dash = spawnSync(
  "curl",
  ["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://127.0.0.1:3010/dashboard"],
  { encoding: "utf8" }
);
const login = spawnSync(
  "curl",
  ["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://127.0.0.1:3010/login"],
  { encoding: "utf8" }
);
const api = spawnSync(
  "curl",
  ["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://127.0.0.1:3011/api/health/live"],
  { encoding: "utf8" }
);

console.log(
  `▶ health login:${(login.stdout || "").trim()} dashboard:${(dash.stdout || "").trim()} api:${(api.stdout || "").trim()}`
);

if (!webOk) {
  console.error("web did not become healthy — see /tmp/rootk-dev-logs/web-3010.err.log");
  process.exit(1);
}

const dashCode = (dash.stdout || "").trim();
if (dashCode === "500") {
  console.error("dashboard still 500 — see /tmp/rootk-dev-logs/web-3010.err.log");
  process.exit(1);
}

console.log("✓ local web ready on http://127.0.0.1:3010");
