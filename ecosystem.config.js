module.exports = {
  apps: [
    {
      name: 'novacart-api',
      script: './server/server.js',
      cwd: '/var/www/novacart',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/www/novacart/logs/error.log',
      out_file: '/var/www/novacart/logs/out.log',
      merge_logs: true,
    },
  ],
};
