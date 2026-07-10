// PM2 Ecosystem Configuration — CommonJS (PM2 requires .cjs)
// Architecture Contract §1.2 — PM2 cluster mode, restart policies
module.exports = {
  apps: [
    {
      name: 'prms-api',
      script: './dist/server.js',
      instances: 'max',            // cluster mode — one per CPU core
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
