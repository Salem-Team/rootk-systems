module.exports = {
  apps: [
    {
      name: "rootk-systems-api",
      cwd: "/var/www/rootk-systems/backend",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3031",
      },
      max_memory_restart: "512M",
    },
    {
      name: "rootk-systems-web",
      cwd: "/var/www/rootk-systems",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3030 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3030",
      },
      max_memory_restart: "768M",
    },
  ],
};
