const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isWin = process.platform === 'win32';

function log(msg) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${msg}`);
}

async function main() {
  log('🚀 后端服务启动器 v2.0 (ELECTRON_RUN_AS_NODE)');
  log(`📂 工作目录: ${process.cwd()}`);
  log(`💻 平台: ${process.platform}`);
  log(`🔧 运行时: ${process.execPath}`);
  log(`🔧 Node版本: ${process.version}`);

  const backendDir = path.join(process.resourcesPath || '', 'backend');
  const serverJs = path.join(backendDir, 'server.js');

  log(`📄 Server路径: ${serverJs}`);

  if (!fs.existsSync(serverJs)) {
    log('❌ 错误: 找不到 server.js');
    process.exit(1);
  }

  const userDataPath = process.env.APPDATA ||
    (isWin ? path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming') : os.homedir());

  const dataDir = path.join(userDataPath, '数字人视频生成系统', 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    log(`📁 创建数据目录: ${dataDir}`);
  }

  const dbPath = path.join(dataDir, 'database.sqlite');

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: '3000',
    DB_DIALECT: 'sqlite',
    DB_PATH: dbPath
  };

  log(`💾 数据库: ${dbPath}`);
  log(`🔌 端口: 3000`);
  log('');
  log('⏳ 正在启动后端服务...');

  try {
    const child = spawn(process.execPath, [serverJs], {
      cwd: backendDir,
      env: env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    let output = '';

    child.stdout.on('data', (data) => {
      const msg = data.toString();
      output += msg;

      if (msg.includes('running on port') || msg.includes('Server running')) {
        log('✅ 后端服务已就绪!');
        log(`   PID: ${child.pid}`);
        log(`   地址: http://localhost:3001`);

        setTimeout(() => {
          process.exit(0);
        }, 1000);
      }
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('DeprecationWarning')) {
        log(`⚠️  ${msg}`);
      }
    });

    child.on('error', (err) => {
      log(`❌ 启动失败: ${err.message}`);
      process.exit(1);
    });

    child.on('exit', (code) => {
      log(`🔴 进程退出 (code=${code})`);
      if (code !== 0) {
        process.exit(code || 1);
      }
    });

    setTimeout(() => {
      if (!output.includes('running on port')) {
        log('⏰ 启动超时 (15秒)，但进程可能仍在运行...');
        log('   请检查是否可以访问 http://localhost:3001');
        process.exit(0);
      }
    }, 15000);

  } catch (error) {
    log(`❌ 异常: ${error.message}`);
    process.exit(1);
  }
}

main();
