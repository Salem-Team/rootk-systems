/**
 * Local PM2 apps for ROOTK Systems (dev machine only).
 * Production VPS uses ecosystem.config.cjs instead.
 *
 * Usage (filename must match ecosystem*.config.* for PM2):
 *   npm run dev:local
 *   npm run dev:local:restart
 */
const path = require("path");

const root = __dirname;
const logsDir = "/tmp/rootk-dev-logs";

module.exports = {
  apps: [
    {
      name: "rootk-api-3011",
      cwd: path.join(root, "backend"),
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      out_file: path.join(logsDir, "api-3011.log"),
      error_file: path.join(logsDir, "api-3011.err.log"),
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: "3011",
        CORS_ORIGIN:
          "http://localhost:3010,http://127.0.0.1:3010",
      },
    },
    {
      name: "rootk-web-3010",
      cwd: root,
      // Call Next directly — avoids nested npm restarts fighting over .next
      script: path.join(root, "node_modules/next/dist/bin/next"),
      args: ["dev", "--turbopack", "-p", "3010", "-H", "0.0.0.0"],
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
      kill_timeout: 5000,
      out_file: path.join(logsDir, "web-3010.log"),
      error_file: path.join(logsDir, "web-3010.err.log"),
      merge_logs: true,
      env: {
        NODE_ENV: "development",
        PORT: "3010",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3011/api",
        NEXT_PUBLIC_DATA_SOURCE: "api",
      },
    },
  ],
};
