#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isWin = process.platform === 'win32';

function log(msg) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${msg}`);
}

function getAppDir() {
  if (process.env.APP_DIR) {
    return process.env.APP_DIR;
  }
  return path.dirname(process.execPath);
}

async function checkPort(port) {
  return new Promise((resolve) => {
    if (isWin) {
      exec(`netstat -an | findstr ":${port}.*LISTENING"`, (error) => {
        resolve(!error);
      });
    } else {
      exec(`lsof -i :${port} | grep LISTEN`, (error) => {
        resolve(!error);
      });
    }
  });
}

function getElectronExe() {
  const appDir = getAppDir();
  if (isWin) {
    return path.join(appDir, '数字人视频生成系统.exe');
  }
  return path.join(appDir, '数字人视频生成系统');
}

async function startBackend(electronExe, backendDir) {
  const serverJs = path.join(backendDir, 'server.js');

  if (!fs.existsSync(serverJs)) {
    log('❌ 找不到 server.js: ' + serverJs);
    return false;
  }

  const userDataPath = os.homedir();
  let dataDir;

  if (isWin) {
    dataDir = path.join(userDataPath, 'AppData', 'Roaming', '数字人视频生成系统', 'data');
  } else {
    dataDir = path.join(userDataPath, '.数字人视频生成系统', 'data');
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
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

  log('🚀 启动后端服务 (ELECTRON_RUN_AS_NODE)...');
  log('   运行时: ' + electronExe);
  log('   目录: ' + backendDir);
  log('   数据库: ' + dbPath);

  return new Promise((resolve) => {
    const child = spawn(electronExe, [serverJs], {
      cwd: backendDir,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      windowsHide: true
    });

    let output = '';

    child.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        output += msg;
        if (msg.includes('running on port') || msg.includes('Server running')) {
          log('✅ 后端服务就绪!');
          resolve(true);
        }
      }
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('DeprecationWarning') && !msg.includes('(node:')) {
        log('⚠️  后端: ' + msg);
      }
    });

    child.on('error', (err) => {
      log('❌ 启动失败: ' + err.message);
      resolve(false);
    });

    child.on('exit', (code) => {
      log('🔴 后端退出 (code=' + code + ')');
    });

    setTimeout(async () => {
      log('⏳ 检查端口 3000...');

      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));

        const isReady = await checkPort(3000);
        if (isReady) {
          log('✅ 端口 3000 就绪 (' + (i + 1) + '秒)');
          resolve(true);
          return;
        }

        process.stdout.write('.');
      }

      log('');
      log('⚠️  后端可能未完全就绪，继续启动前端...');
      resolve(true);
    }, 2000);
  });
}

async function startFrontend(electronExe) {
  if (!fs.existsSync(electronExe)) {
    log('❌ 找不到主程序: ' + electronExe);
    return false;
  }

  log('🖥️  启动前端界面...');
  log('   程序: ' + electronExe);

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const child = spawn(electronExe, [], {
    env: env,
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  log('✅ 前端已启动!');
  return true;
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     🎬 数字人视频生成系统 v1.0.0           ║');
  console.log('║     Digital Human Video Generator          ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  const appDir = getAppDir();
  const backendDir = path.join(appDir, 'resources', 'backend');
  const electronExe = getElectronExe();

  log('📂 应用目录: ' + appDir);
  log('💻 平台: ' + process.platform + ' ' + process.arch);

  if (!fs.existsSync(electronExe)) {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ❌ 错误: 找不到 Electron 主程序          ║');
    console.log('╠═══════════════════════════════════════════╣');
    console.log('║  请确认应用安装完整                       ║');
    console.log('╚════════════════════════════════════════════╝');
    process.exit(1);
  }

  log('✅ Electron 主程序已找到');

  log('');
  log('[步骤 1/2] 启动后端服务...');

  const backendOk = await startBackend(electronExe, backendDir);

  if (!backendOk) {
    log('⚠️  后端可能未成功启动');
  }

  log('');
  log('[步骤 2/2] 启动前端界面...');
  await new Promise(r => setTimeout(r, 1000));

  const frontendOk = await startFrontend(electronExe);

  if (frontendOk) {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║                                          ║');
    console.log('║   ✅✅✅ 应用启动完成！✅✅✅               ║');
    console.log('║                                          ║');
    console.log('║   前端窗口应该已经弹出                  ║');
    console.log('║   请等待几秒让页面加载                   ║');
    console.log('║   然后即可注册和登录                     ║');
    console.log('║                                          ║');
    console.log('╚════════════════════════════════════════════╝');
  } else {
    console.log('');
    console.log('❌ 前端启动失败');
  }

  console.log('');

  if (!isWin) {
    log('按 Ctrl+C 退出此启动器（应用将继续运行）');
    await new Promise(() => {});
  } else {
    setTimeout(() => process.exit(0), 2000);
  }
}

main().catch(err => {
  console.error('致命错误:', err);
  process.exit(1);
});
