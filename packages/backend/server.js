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
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
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
      dialect: sequelize.getDialect()
    },
    ws: {
      online: wsManager.getOnlineCount()
    }
  });
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

app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  acceptRanges: true,
  cacheControl: true,
  maxAge: 3600000,
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));
app.use('/output', express.static(path.join(__dirname, 'output'), {
  acceptRanges: true,
  cacheControl: true,
  maxAge: 3600000,
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
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

    const syncOptions = sequelize.getDialect() === 'sqlite' 
      ? { alter: true } 
      : { alter: true };
    await sequelize.sync(syncOptions);
    console.log('Database tables synchronized.');

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

async function startServer() {
  await initDatabase();

  // 初始化默认云端配置
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

startServer();
