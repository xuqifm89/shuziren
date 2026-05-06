module.exports = {
  apps: [
    {
      name: 'shuziren-backend',
      script: 'server.js',
      cwd: './packages/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/shuziren.git',
      path: '/opt/shuziren',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:backend && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}
