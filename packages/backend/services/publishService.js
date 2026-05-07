const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const publishRepo = require('../repositories/PublishRepository');

const PLATFORMS = ['douyin', 'bilibili', 'xiaohongshu', 'kuaishou'];

const PLATFORM_NAMES = {
  douyin: '抖音',
  bilibili: 'B站',
  xiaohongshu: '小红书',
  kuaishou: '快手'
};

const SAU_PROJECT_DIR = path.join(__dirname, '..', 'social-auto-upload');

let _sauAvailable = null;
let _sauCommand = null;

async function isSauAvailable() {
  if (_sauAvailable !== null) return _sauAvailable;
  _sauAvailable = fs.existsSync(SAU_PROJECT_DIR) && fs.existsSync(path.join(SAU_PROJECT_DIR, 'pyproject.toml'));
  return _sauAvailable;
}

function findSauCommand() {
  if (_sauCommand) return _sauCommand;

  try {
    const result = execSync('which sau', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (result && fs.existsSync(result)) {
      _sauCommand = result;
      console.log(`✅ Found sau command: ${result}`);
      return result;
    }
  } catch (e) {}

  try {
    const result = execSync('which uv', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (result && fs.existsSync(result)) {
      _sauCommand = result;
      console.log(`✅ Using uv for sau: ${result}`);
      return result;
    }
  } catch (e) {}

  _sauCommand = 'sau';
  return _sauCommand;
}

function getSauSpawnArgs(cliArgs) {
  const env = { ...process.env }
  if (process.env.CHROME_PATH) env.CHROME_PATH = process.env.CHROME_PATH
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH

  const sauCmd = findSauCommand();
  const isUv = sauCmd.endsWith('uv') || sauCmd === 'uv';

  if (isUv) {
    return {
      command: sauCmd,
      args: ['run', 'sau', ...cliArgs],
      options: { cwd: SAU_PROJECT_DIR, timeout: 600000, env }
    };
  }

  return {
    command: sauCmd,
    args: cliArgs,
    options: { cwd: SAU_PROJECT_DIR, timeout: 600000, env }
  };
}

async function checkSauInstalled() {
  if (!(await isSauAvailable())) {
    console.warn(`⚠️ social-auto-upload 目录不存在或未配置: ${SAU_PROJECT_DIR}`);
    return false;
  }
  return new Promise((resolve) => {
    const { command, args, options } = getSauSpawnArgs(['--help']);
    const child = spawn(command, args, { ...options, timeout: 10000 });
    child.on('error', (err) => {
      console.warn(`⚠️ sau 命令执行失败: ${err.message}`);
      _sauAvailable = false;
      _sauCommand = null;
      resolve(false);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        _sauAvailable = false;
        _sauCommand = null;
      }
      resolve(code === 0);
    });
  });
}

function isHeadlessEnvironment() {
  if (process.env.DISPLAY) return false
  try { execSync('ps aux | grep [X]vfb', { stdio: 'pipe' }); return false } catch (e) { return true }
}

async function loginAccount(platform, accountName) {
  if (!PLATFORMS.includes(platform)) {
    throw new Error(`不支持的平台: ${platform}`);
  }

  if (!fs.existsSync(SAU_PROJECT_DIR)) {
    throw new Error(`social-auto-upload 目录不存在，请确认已安装: ${SAU_PROJECT_DIR}`);
  }

  const useHeaded = !isHeadlessEnvironment()
  const loginArgs = [platform, 'login', '--account', accountName]
  if (useHeaded) loginArgs.push('--headed')

  console.log(`🔐 Starting login for ${platform} account: ${accountName} (${useHeaded ? 'headed' : 'headless'})`);

  return new Promise((resolve, reject) => {
    const { command, args, options } = getSauSpawnArgs(loginArgs);
    
    console.log(`🚀 Executing command: ${command} ${args.join(' ')}`);
    console.log(`📁 Working directory: ${options.cwd}`);
    
    const child = spawn(command, args, { ...options, timeout: 180000 });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[LOGIN STDOUT]`, output.trim());
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.warn(`[LOGIN STDERR]`, output.trim());
    });

    child.on('close', (code) => {
      console.log(`🔓 Login process exited with code: ${code}`);
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        reject(new Error(stderr || stdout || `登录失败 (exit code: ${code})`));
      }
    });

    child.on('error', (err) => {
      console.error(`❌ Login process error:`, err.message);
      reject(new Error(`无法执行 sau 命令: ${err.message}`));
    });
  });
}

async function checkAccount(platform, accountName) {
  if (!PLATFORMS.includes(platform)) {
    throw new Error(`不支持的平台: ${platform}`);
  }

  return new Promise((resolve) => {
    const { command, args, options } = getSauSpawnArgs([platform, 'check', '--account', accountName]);
    const child = spawn(command, args, { ...options, timeout: 30000 });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        valid: code === 0,
        output: stdout || stderr
      });
    });

    child.on('error', () => {
      resolve({ valid: false, output: '无法执行 sau 命令' });
    });
  });
}

async function uploadVideo({ taskId, platform, accountName, filePath, thumbnailPath, title, desc, tags, publishType, scheduleTime, tid }) {
  if (!PLATFORMS.includes(platform)) {
    throw new Error(`不支持的平台: ${platform}`);
  }

  console.log(`🎬 Starting upload for task ${taskId}:`, {
    platform,
    accountName,
    filePath,
    title
  });

  console.log(`🔍 验证账号 ${platform}/${accountName} 的登录状态...`);
  const checkResult = await checkAccount(platform, accountName);
  
  if (!checkResult.valid) {
    const errorMsg = `账号 ${accountName} (${platform}) 登录已失效，请先重新登录`;
    console.error(`❌ ${errorMsg}`);
    console.error('   Check output:', checkResult.output);
    
    await publishRepo.updateTask(taskId, {
      status: 'failed',
      result: errorMsg,
      processOutput: `Cookie validation failed:\n${checkResult.output}`
    });
    
    throw new Error(errorMsg);
  }
  
  console.log(`✅ 账号 ${platform}/${accountName} 登录状态有效，开始上传...`);

  const sauArgs = [platform, 'upload-video', '--account', accountName, '--file', filePath, '--title', title];

  if (desc) {
    sauArgs.push('--desc', desc);
  }

  if (tags && tags.length > 0) {
    sauArgs.push('--tags', tags.join(','));
  }

  if (thumbnailPath) {
    sauArgs.push('--thumbnail', thumbnailPath);
  }

  if (platform === 'bilibili' && tid) {
    sauArgs.push('--tid', String(tid));
  }

  if (publishType === 'scheduled' && scheduleTime) {
    const d = new Date(scheduleTime);
    const scheduleStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    sauArgs.push('--schedule', scheduleStr);
  }

  return new Promise((resolve, reject) => {
    const { command, args, options } = getSauSpawnArgs(sauArgs);
    const child = spawn(command, args, options);

    let stdout = '';
    let stderr = '';

    publishRepo.updateTask(taskId, { status: 'running' });

    child.stdout.on('data', async (data) => {
      stdout += data.toString();
      await publishRepo.updateTask(taskId, { processOutput: stdout });
    });

    child.stderr.on('data', async (data) => {
      stderr += data.toString();
    });

    child.on('close', async (code) => {
      if (code === 0) {
        await publishRepo.updateTask(taskId, {
          status: 'success',
          result: stdout,
          processOutput: stdout
        });
        resolve({ success: true, output: stdout });
      } else {
        await publishRepo.updateTask(taskId, {
          status: 'failed',
          result: stderr || stdout,
          processOutput: stdout + '\n' + stderr
        });
        reject(new Error(stderr || stdout || '上传失败'));
      }
    });

    child.on('error', async (err) => {
      await publishRepo.updateTask(taskId, {
        status: 'failed',
        result: err.message
      });
      reject(new Error(`无法执行 sau 命令: ${err.message}`));
    });
  });
}

async function batchUpload({ userId, accounts, videoPath, thumbnailPath, title, description, tags, publishType, scheduleTime, bilibiliTid }) {
  const results = [];

  console.log('📤 Starting batch upload:', {
    userId,
    accountCount: accounts.length,
    videoPath,
    title,
    publishType
  });

  for (const account of accounts) {
    console.log(`📋 Creating task for ${account.platform} account: ${account.accountName}`);

    const task = await publishRepo.createTask({
      userId,
      accountId: account.id,
      platform: account.platform,
      videoPath,
      thumbnailPath,
      title,
      description,
      tags: tags || [],
      publishType: publishType || 'immediate',
      scheduleTime: scheduleTime || null,
      status: 'pending'
    });

    console.log(`✅ Task created: ${task.id}, starting upload process...`);

    uploadVideo({
      taskId: task.id,
      platform: account.platform,
      accountName: account.accountName,
      filePath: videoPath,
      thumbnailPath,
      title,
      desc: description,
      tags,
      publishType,
      scheduleTime,
      tid: account.platform === 'bilibili' ? bilibiliTid : undefined
    }).then(result => {
      console.log(`✅ Upload success for task ${task.id}:`, result);
    }).catch(err => {
      console.error(`❌ Upload failed for task ${task.id}:`, err.message);
      console.error('   Error stack:', err.stack);
    });

    results.push(task);
  }

  console.log(`📊 Batch upload initiated: ${results.length} tasks created`);
  return results;
}

module.exports = {
  PLATFORMS,
  PLATFORM_NAMES,
  isSauAvailable,
  checkSauInstalled,
  loginAccount,
  checkAccount,
  uploadVideo,
  batchUpload
};
