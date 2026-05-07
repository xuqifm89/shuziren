const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const publishRepo = require('../repositories/PublishRepository');
const publishService = require('../services/publishService');
const fileService = require('../services/fileService');

function resolvePath(p) {
  if (!p) return p;
  if (p.startsWith('http://localhost:') || p.startsWith('http://127.0.0.1:')) {
    try {
      const url = new URL(p);
      return path.join(__dirname, '..', url.pathname);
    } catch (e) {
      return p;
    }
  }
  if (p.startsWith('/output') || p.startsWith('/assets')) {
    return path.join(__dirname, '..', p);
  }
  return p;
}

const thumbnailsDir = path.join(__dirname, '../assets/thumbnails');
fileService.ensureDir(thumbnailsDir);

const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, thumbnailsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const thumbnailUpload = multer({ storage: thumbnailStorage });

router.get('/platforms', (req, res) => {
  const platforms = publishService.PLATFORMS.map(p => ({
    key: p,
    name: publishService.PLATFORM_NAMES[p]
  }));
  res.json(platforms);
});

router.get('/check-sau', async (req, res) => {
  try {
    const installed = await publishService.checkSauInstalled();
    res.json({ installed });
  } catch (error) {
    res.json({ installed: false });
  }
});

router.get('/accounts', async (req, res) => {
  try {
    const { userId } = req.query;
    const accounts = await publishRepo.findAllAccounts(userId || '00000000-0000-0000-0000-000000000000');
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const { userId, platform, accountName } = req.body;

    if (!platform || !accountName) {
      return res.status(400).json({ error: '平台和账号名不能为空' });
    }

    if (!publishService.PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `不支持的平台: ${platform}` });
    }

    const account = await publishRepo.createAccount({
      userId: userId || '00000000-0000-0000-0000-000000000000',
      platform,
      accountName,
      cookieValid: false,
      status: 'active'
    });

    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/accounts/:id/qrcode', async (req, res) => {
  try {
    const account = await publishRepo.findAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: '账号不存在' });
    }

    const fs = require('fs');
    const path = require('path');
    const cookiesDir = path.join(__dirname, '..', 'social-auto-upload', 'cookies');

    // 查找最新的二维码文件
    const qrcodePattern = `${account.platform}_${account.accountName}_login_qrcode_*.png`;
    const files = fileService.readDir(cookiesDir)
      .filter(f => f.startsWith(`${account.platform}_${account.accountName}_login_qrcode_`))
      .sort()
      .reverse();

    if (files.length === 0) {
      return res.status(404).json({ error: '未找到二维码，请先发起登录请求' });
    }

    const latestQrcode = files[0];
    const qrcodePath = path.join(cookiesDir, latestQrcode);

    console.log('📱 返回二维码:', latestQrcode);

    res.json({
      success: true,
      qrcodeUrl: `/social-auto-upload/cookies/${latestQrcode}`,
      filename: latestQrcode,
      createdAt: fileService.fileStats(qrcodePath).mtime
    });
  } catch (error) {
    console.error('❌ 获取二维码失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const loginProcesses = new Map();

router.post('/accounts/:id/login', async (req, res) => {
  try {
    const account = await publishRepo.findAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: '账号不存在' });
    }

    const processKey = `${account.platform}_${account.accountName}`;
    if (loginProcesses.has(processKey)) {
      return res.json({ success: true, message: '登录进程已在运行', status: 'running' });
    }

    const loginPromise = publishService.loginAccount(account.platform, account.accountName);
    loginProcesses.set(processKey, { promise: loginPromise, status: 'running', output: '' });

    loginPromise.then(async (result) => {
      await publishRepo.updateAccount(account.id, {
        cookieValid: true,
        lastCheckedAt: new Date()
      });
      loginProcesses.set(processKey, { status: 'success', output: result.output });
      setTimeout(() => loginProcesses.delete(processKey), 60000);
    }).catch((err) => {
      loginProcesses.set(processKey, { status: 'failed', output: err.message });
      setTimeout(() => loginProcesses.delete(processKey), 60000);
    });

    res.json({ success: true, message: '登录进程已启动', status: 'running' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/accounts/:id/login-status', async (req, res) => {
  try {
    const account = await publishRepo.findAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: '账号不存在' });
    }

    const processKey = `${account.platform}_${account.accountName}`;
    const process = loginProcesses.get(processKey);

    let qrcodeUrl = null;
    try {
      const cookiesDir = path.join(__dirname, '..', 'social-auto-upload', 'cookies');
      const fs = require('fs');
      if (fs.existsSync(cookiesDir)) {
        const files = fs.readdirSync(cookiesDir)
          .filter(f => f.startsWith(`${account.platform}_${account.accountName}_login_qrcode_`))
          .sort()
          .reverse();
        if (files.length > 0) {
          qrcodeUrl = `/social-auto-upload/cookies/${files[0]}`;
        }
      }
    } catch (e) {}

    res.json({
      status: process ? process.status : 'idle',
      output: process ? process.output : '',
      qrcodeUrl,
      cookieValid: account.cookieValid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/accounts/:id/check', async (req, res) => {
  try {
    const account = await publishRepo.findAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: '账号不存在' });
    }

    const result = await publishService.checkAccount(account.platform, account.accountName);

    await publishRepo.updateAccount(account.id, {
      cookieValid: result.valid,
      lastCheckedAt: new Date()
    });

    res.json({ valid: result.valid, output: result.output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const account = await publishRepo.deleteAccount(req.params.id);
    if (account) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '账号不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const { userId, status } = req.query;
    let tasks;
    if (status) {
      tasks = await publishRepo.findTasksByStatus(userId || '00000000-0000-0000-0000-000000000000', status);
    } else {
      tasks = await publishRepo.findAllTasks(userId || '00000000-0000-0000-0000-000000000000');
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await publishRepo.findTaskById(req.params.id);
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ error: '任务不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/stats/summary', async (req, res) => {
  try {
    const { userId } = req.query;
    const stats = await publishRepo.getTaskStats(userId || '00000000-0000-0000-0000-000000000000');
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', async (req, res) => {
  try {
    const { userId, accountIds, videoPath, thumbnailPath, title, description, tags, publishType, scheduleTime, bilibiliTid } = req.body;

    if (!accountIds || !accountIds.length) {
      return res.status(400).json({ error: '请选择至少一个账号' });
    }

    if (!videoPath) {
      return res.status(400).json({ error: '视频路径不能为空' });
    }

    if (!title) {
      return res.status(400).json({ error: '标题不能为空' });
    }

    const resolvedVideoPath = resolvePath(videoPath);
    const resolvedThumbnailPath = thumbnailPath ? resolvePath(thumbnailPath) : null;

    console.log('📤 Publish upload request:', {
      videoPath,
      resolvedVideoPath,
      thumbnailPath,
      resolvedThumbnailPath,
      title,
      accountIds: accountIds.length
    });

    const accounts = [];
    for (const accountId of accountIds) {
      const account = await publishRepo.findAccountById(accountId);
      if (account) {
        accounts.push(account);
      }
    }

    if (!accounts.length) {
      return res.status(400).json({ error: '未找到有效账号' });
    }

    const tasks = await publishService.batchUpload({
      userId: userId || '00000000-0000-0000-0000-000000000000',
      accounts,
      videoPath: resolvedVideoPath,
      thumbnailPath: resolvedThumbnailPath,
      title,
      description,
      tags,
      publishType,
      scheduleTime,
      bilibiliTid
    });

    res.status(201).json(tasks);
  } catch (error) {
    console.error('❌ Publish upload error:', error.message);
    console.error(error.stack);
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload-thumbnail', thumbnailUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传封面图片' });
    }
    const fileUrl = `/assets/thumbnails/${req.file.filename}`;
    const absolutePath = path.join(thumbnailsDir, req.file.filename);
    res.json({ fileUrl, absolutePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
