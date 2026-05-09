const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const sequelize = require('./config/database');
const User = require('./models/User');
const Avatar = require('./models/Avatar');
const Voice = require('./models/Voice');
const VoiceLibrary = require('./models/VoiceLibrary');
const DubbingLibrary = require('./models/DubbingLibrary');
const MusicLibrary = require('./models/MusicLibrary');
const PortraitLibrary = require('./models/PortraitLibrary');
const CopyLibrary = require('./models/CopyLibrary');
const PromptLibrary = require('./models/PromptLibrary');
const WorkLibrary = require('./models/WorkLibrary');
const PublishAccount = require('./models/PublishAccount');
const PublishTask = require('./models/PublishTask');
const Task = require('./models/Task');
const Project = require('./models/Project');
const CloudConfig = require('./models/CloudConfig');
const ApiLog = require('./models/ApiLog');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const wsManager = require('./websocket/WebSocketManager');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { globalLimiter, authLimiter, apiLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const helmet = require('helmet');

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3001'
];

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : defaultOrigins;

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(globalLimiter);
app.use(requestLogger);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const { authMiddleware, optionalAuth } = require('./middleware/auth');

const { requireRole, requirePermission } = require('./middleware/rbac');

app.use('/api/v1', optionalAuth, require('./routes/v1'));
app.use('/api/admin', requireRole('admin'), require('./routes/admin'));

app.use('/api/audio', authMiddleware, requirePermission('task:create'), require('./routes/audio'));
app.use('/api/video', authMiddleware, requirePermission('task:create'), require('./routes/video'));
app.use('/api/text', optionalAuth, require('./routes/text'));
app.use('/api/clips', authMiddleware, requirePermission('task:create'), require('./routes/clips'));
app.use('/api/models', optionalAuth, require('./routes/models'));
app.use('/api/users', require('./routes/users'));
app.use('/api/voice-library', optionalAuth, require('./routes/voiceLibrary'));
app.use('/api/dubbing-library', optionalAuth, require('./routes/dubbingLibrary'));
app.use('/api/music-library', optionalAuth, require('./routes/musicLibrary'));
app.use('/api/portrait-library', optionalAuth, require('./routes/portraitLibrary'));
app.use('/api/copy-library', optionalAuth, require('./routes/copyLibrary'));
app.use('/api/prompt-library', optionalAuth, require('./routes/promptLibrary'));
app.use('/api/work-library', optionalAuth, require('./routes/workLibrary'));
app.use('/api/publish', optionalAuth, require('./routes/publish'));
app.use('/api/tasks', authMiddleware, require('./routes/tasks'));
app.use('/api/runninghub', authMiddleware, requirePermission('task:create'), require('./routes/runningHub'));
app.use('/api/cloud-config', authMiddleware, requirePermission('system:config'), require('./routes/cloudConfig'));
app.use('/api/api-logs', authMiddleware, requirePermission('system:logs'), require('./routes/apiLogs'));
app.use('/api/dashboard', authMiddleware, requirePermission('system:stats'), require('./routes/dashboard'));
app.use('/api/audit-logs', authMiddleware, requirePermission('system:logs'), require('./routes/auditLogs'));
app.use('/api/ws', require('./routes/websocket'));

const { staticFileMiddleware, serveFileWithRange } = require('./middleware/fileServer');

app.get('/api/health', async (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  let dbStatus = 'disconnected';
  let userCount = 0;
  let dbSizeMB = 0;
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
    const User = require('./models/User');
    userCount = await User.count();
    const fs = require('fs');
    const path = require('path');
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
    if (fs.existsSync(dbPath)) {
      dbSizeMB = (fs.statSync(dbPath).size / 1024 / 1024).toFixed(2);
    }
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }

  res.json({
    status: 'ok',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) + 'MB'
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000) + 'ms',
      system: Math.round(cpuUsage.system / 1000) + 'ms'
    },
    database: {
      status: dbStatus,
      dialect: sequelize.getDialect(),
      userCount,
      sizeMB: dbSizeMB
    },
    ws: {
      online: wsManager.getOnlineCount()
    }
  });
});

app.post('/api/maintenance/cleanup', async (req, res) => {
  try {
    const { cleanupOldData, checkDiskSpace } = require('./scripts/dbOptimize');
    await checkDiskSpace();
    await cleanupOldData();
    res.json({ success: true, message: 'Database cleanup completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/maintenance/diagnose', async (req, res) => {
  const result = { database: {}, files: {}, pragmas: {} };
  try {
    const fs = require('fs');
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      result.files.database = { path: dbPath, sizeMB: (stats.size / 1024 / 1024).toFixed(2), modified: stats.mtime };
    }
    
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) {
      const walStats = fs.statSync(walPath);
      result.files.wal = { path: walPath, sizeMB: (walStats.size / 1024 / 1024).toFixed(2) };
    }
    
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) {
      const shmStats = fs.statSync(shmPath);
      result.files.shm = { path: shmPath, sizeMB: (shmStats.size / 1024 / 1024).toFixed(2) };
    }

    try {
      const { QueryTypes } = require('sequelize');
      const tables = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'", { type: QueryTypes.SELECT });
      result.database.tables = {};
      for (const t of tables) {
        const count = await sequelize.query(`SELECT COUNT(*) as cnt FROM "${t.name}"`, { type: QueryTypes.SELECT }).catch(() => [{ cnt: 'error' }]);
        result.database.tables[t.name] = count[0]?.cnt;
      }

      const integrity = await sequelize.query('PRAGMA integrity_check', { type: QueryTypes.SELECT });
      result.pragmas.integrity_check = integrity;

      const journalMode = await sequelize.query('PRAGMA journal_mode', { type: QueryTypes.SELECT });
      result.pragmas.journal_mode = journalMode;

      const pageSize = await sequelize.query('PRAGMA page_size', { type: QueryTypes.SELECT });
      result.pragmas.page_size = pageSize;

      const pageCount = await sequelize.query('PRAGMA page_count', { type: QueryTypes.SELECT });
      result.pragmas.page_count = pageCount;

      const freePages = await sequelize.query('PRAGMA freelist_count', { type: QueryTypes.SELECT });
      result.pragmas.freelist_count = freePages;
    } catch (dbErr) {
      result.database.error = dbErr.message;
    }

    try {
      const { execSync } = require('child_process');
      const dfOutput = execSync('df -h /app 2>/dev/null || df -h / 2>/dev/null', { encoding: 'utf-8' }).trim();
      result.disk = dfOutput.split('\n');
    } catch (e) {}

  } catch (error) {
    result.error = error.message;
  }
  res.json(result);
});

app.post('/api/maintenance/repair', async (req, res) => {
  try {
    const fs = require('fs');
    const { QueryTypes } = require('sequelize');
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');

    const steps = [];

    try {
      await sequelize.query('PRAGMA wal_checkpoint(TRUNCATE)', { type: QueryTypes.RAW });
      steps.push('wal_checkpoint(TRUNCATE) completed');
    } catch (e) {
      steps.push('wal_checkpoint failed: ' + e.message);
    }

    try {
      await sequelize.query('PRAGMA journal_mode=DELETE', { type: QueryTypes.RAW });
      steps.push('journal_mode set to DELETE');
    } catch (e) {
      steps.push('journal_mode change failed: ' + e.message);
    }

    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    
    try {
      await sequelize.query('PRAGMA wal_checkpoint(TRUNCATE)', { type: QueryTypes.RAW });
    } catch (e) {}

    try {
      if (fs.existsSync(walPath)) {
        const walSize = fs.statSync(walPath).size;
        if (walSize === 0) {
          fs.unlinkSync(walPath);
          steps.push('Deleted empty WAL file');
        } else {
          steps.push(`WAL file still has ${walSize} bytes, could not delete`);
        }
      }
    } catch (e) {
      steps.push('WAL delete failed: ' + e.message);
    }

    try {
      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
        steps.push('Deleted SHM file');
      }
    } catch (e) {
      steps.push('SHM delete failed: ' + e.message);
    }

    try {
      const { cleanupOldData } = require('./scripts/dbOptimize');
      await cleanupOldData();
      steps.push('cleanupOldData completed');
    } catch (e) {
      steps.push('cleanupOldData failed: ' + e.message);
    }

    try {
      await sequelize.query('VACUUM', { type: QueryTypes.RAW });
      steps.push('VACUUM completed');
    } catch (e) {
      steps.push('VACUUM failed: ' + e.message);
    }

    const integrity = await sequelize.query('PRAGMA integrity_check', { type: QueryTypes.SELECT });
    steps.push('integrity_check: ' + JSON.stringify(integrity));

    res.json({ success: true, steps, integrity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/assets/portraits/videos/:filename', (req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const filePath = path.join(__dirname, 'assets', 'portraits', 'videos', req.params.filename);
  serveFileWithRange(req, res, filePath, { maxAge: 3600 });
});

app.get('/assets/voices/:filename', (req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const filePath = path.join(__dirname, 'assets', 'voices', req.params.filename);
  serveFileWithRange(req, res, filePath, { maxAge: 3600 });
});

app.get('/assets/dubbings/:filename', (req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const filePath = path.join(__dirname, 'assets', 'dubbings', req.params.filename);
  serveFileWithRange(req, res, filePath, { maxAge: 3600 });
});

app.get('/assets/musics/:filename', (req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const filePath = path.join(__dirname, 'assets', 'musics', req.params.filename);
  serveFileWithRange(req, res, filePath, { maxAge: 3600 });
});

app.get('/assets/*/audio-mp3/*', (req, res) => {
  const parts = req.path.match(/^\/assets\/(.+)\/audio-mp3\/(.+)\.mp3$/);
  if (!parts) {
    return res.status(404).json({ error: '路径格式错误' });
  }

  const dir = parts[1];
  const baseName = parts[2];
  const flacPath = path.join(__dirname, 'assets', dir, baseName + '.flac');
  const mp3Dir = path.join(__dirname, 'assets', dir, 'audio-mp3');
  const mp3Path = path.join(mp3Dir, baseName + '.mp3');

  if (require('fs').existsSync(mp3Path)) {
    return res.sendFile(mp3Path);
  }

  if (require('fs').existsSync(flacPath)) {
    try {
      require('fs').mkdirSync(mp3Dir, { recursive: true });
      const ffmpegPath = require('./utils/ffmpegHelper').getFfmpegPath() || 'ffmpeg';
      require('child_process').execSync(`"${ffmpegPath}" -y -i "${flacPath}" -ab 192k -f mp3 "${mp3Path}"`, { timeout: 30000 });
      return res.sendFile(mp3Path);
    } catch (e) {
      console.error('FLAC转MP3失败:', e.message);
      return res.status(500).json({ error: '转码失败' });
    }
  }

  res.status(404).json({ error: '文件不存在' });
});

app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  acceptRanges: true,
  cacheControl: true,
  maxAge: 3600000,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (filePath.endsWith('.flac')) {
      res.setHeader('Content-Type', 'audio/flac');
    } else if (filePath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (filePath.endsWith('.aac')) {
      res.setHeader('Content-Type', 'audio/aac');
    }
  }
}));
app.use('/output', express.static(path.join(__dirname, 'output'), {
  acceptRanges: true,
  cacheControl: true,
  maxAge: 3600000,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (filePath.endsWith('.flac')) {
      res.setHeader('Content-Type', 'audio/flac');
    } else if (filePath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (filePath.endsWith('.aac')) {
      res.setHeader('Content-Type', 'audio/aac');
    }
  }
}));
app.use('/social-auto-upload/cookies', express.static(
  path.join(__dirname, 'social-auto-upload', 'cookies'),
  {
    cacheControl: true,
    maxAge: 60000,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  }
));

async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    try {
      const { cleanupOldData, checkDiskSpace } = require('./scripts/dbOptimize');
      await checkDiskSpace();
      await cleanupOldData();
    } catch (cleanErr) {
      console.warn('⚠️ Pre-sync cleanup failed:', cleanErr.message);
    }

    try {
      const syncOptions = sequelize.getDialect() === 'sqlite' 
        ? { alter: true } 
        : { alter: true };
      await sequelize.sync(syncOptions);
      console.log('Database tables synchronized.');
    } catch (syncErr) {
      if (syncErr.message?.includes('SQLITE_FULL') || syncErr.message?.includes('disk is full')) {
        console.error('⚠️ Database sync failed: disk full. Trying without alter...');
        try {
          await sequelize.sync();
          console.log('Database tables synchronized (without alter).');
        } catch (syncErr2) {
          console.error('⚠️ Database sync also failed without alter:', syncErr2.message);
        }
      } else {
        throw syncErr;
      }
    }

    try {
      const { runOptimizations } = require('./scripts/dbOptimize');
      await runOptimizations();
    } catch (optErr) {
      console.warn('⚠️ Database optimization skipped:', optErr.message);
    }
  } catch (error) {
    console.error('⚠️ Unable to connect to the database:', error);
    console.error('   Database features will be disabled, but API endpoints will still work.');
  }
}

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

async function startServer() {
  try {
    await initDatabase();
  } catch (dbErr) {
    console.error('⚠️ Database initialization failed (non-fatal):', dbErr.message);
  }

  try {
    const { initializeDefaultConfigs } = require('./scripts/initDefaultConfigs');
    await initializeDefaultConfigs();
  } catch (error) {
    console.warn('⚠️ 初始化云端配置失败（非致命错误）:', error.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   API endpoints available at http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`   管理后台: http://localhost:5174`);
  });

  wsManager.attach(server);

  server.timeout = 600000;

  app.use(errorHandler);
  server.headersTimeout = 600000;
  server.requestTimeout = 600000;
  server.keepAliveTimeout = 600000;
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});
