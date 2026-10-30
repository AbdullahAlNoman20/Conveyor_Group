
module.exports = {
  apps: [
    {
      name: "conveyor-dining",
      cwd: "/home/qrapp/apps/conveyor-dining/server",
      script: "dist/src/server.js",
      node_args: "--env-file=.env",
      // One process: Socket.IO polling needs sticky sessions in cluster mode,
      // and the BullMQ daily jobs then run exactly once.
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "400M",
      kill_timeout: 10000,
      listen_timeout: 15000,
      out_file: "/home/qrapp/logs/conveyor-dining.out.log",
      error_file: "/home/qrapp/logs/conveyor-dining.err.log",
      merge_logs: true,
      time: true,
      env: { NODE_ENV: "production" },
    },
  ],
};