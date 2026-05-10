# 拾光引擎 - 本地安装版架构设计

## 一、总体架构

本地安装版采用**混合模式**：前端和基础后端在本地运行，AI相关功能通过远程服务器代理。

```
┌──────────────────────────────────────────┐
│  Electron 桌面端                           │
│                                          │
│  ┌──────────┐    ┌──────────────────┐    │
│  │ 在线版前端 │◄──│ 本地后端进程       │    │
│  │ (渲染进程) │    │ localhost:3001   │    │
│  └──────────┘    └───┬──────────┬────┘   │
│                      │          │        │
│  本地功能：           │          │        │
│  ├── SQLite数据库     │          │        │
│  ├── 素材管理/上传     │          │        │
│  ├── 视频剪辑/预览     │          │        │
│  └── 媒体文件存储     │          │        │
└──────────────────────┼──────────┼────────┘
                       │          │
              本地直接处理    需要服务器参与
                       │          │
                       │    ┌─────▼──────────┐
                       │    │  远程服务器       │
                       │    │  m.dsface.com    │
                       │    │                 │
                       │    │ ① 登录认证       │
                       │    │ ② AI任务代理     │
                       │    │    ├→ RunningHub │
                       │    │    ├→ SiliconFlow│
                       │    │    └→ 其他AI服务  │
                       │    │ ③ 用量统计/计费   │
                       │    │ ④ API Key管理    │
                       │    └─────────────────┘
```

## 二、请求路由规则

| 功能 | 走本地 | 走服务器 | 原因 |
|------|:------:|:-------:|------|
| 登录/注册 | ❌ | ✅ | 服务器管控用户准入 |
| AI视频生成 | ❌ | ✅ | 服务器管控API Key和用量 |
| AI配音生成 | ❌ | ✅ | 服务器管控API Key和用量 |
| AI文案生成 | ❌ | ✅ | 服务器管控API Key和用量 |
| AI字幕生成 | ❌ | ✅ | 服务器管控API Key和用量 |
| 素材库CRUD | ✅ | ❌ | 纯本地数据操作 |
| 视频剪辑 | ✅ | ❌ | 本地ffmpeg处理 |
| 文件上传/下载 | ✅ | ❌ | 本地磁盘读写 |
| 视频发布 | ✅ | ❌ | 本地chromium操作 |
| 系统设置 | ✅ | ❌ | 本地配置 |

## 三、本地后端设计

### 3.1 远程代理层

本地后端新增 `routes/aiProxy.js`，所有AI相关请求转发到远程服务器：

```javascript
// 本地后端 routes/aiProxy.js
const REMOTE_SERVER = 'https://m.dsface.com'
const router = express.Router()

// AI视频生成代理
router.post('/generate-video', authMiddleware, async (req, res) => {
  const response = await axios.post(`${REMOTE_SERVER}/api/remote/generate-video`, {
    ...req.body,
    // 本地媒体文件需要先上传或传URL
  }, {
    headers: { Authorization: req.headers.authorization }
  })
  res.json(response.data)
})

// AI配音生成代理
router.post('/generate-voice', authMiddleware, async (req, res) => {
  const response = await axios.post(`${REMOTE_SERVER}/api/remote/generate-voice`, req.body, {
    headers: { Authorization: req.headers.authorization }
  })
  res.json(response.data)
})

// AI文案生成代理
router.post('/generate-text', authMiddleware, async (req, res) => {
  const response = await axios.post(`${REMOTE_SERVER}/api/remote/generate-text`, req.body, {
    headers: { Authorization: req.headers.authorization }
  })
  res.json(response.data)
})
```

### 3.2 登录认证代理

本地不存储用户账号体系，登录请求转发到服务器验证，验证通过后在本地创建会话：

```javascript
// 本地后端 routes/authProxy.js
router.post('/login', async (req, res) => {
  // 转发到远程服务器验证
  const response = await axios.post(`${REMOTE_SERVER}/api/remote/login`, {
    username: req.body.username,
    password: req.body.password,
    deviceId: getDeviceId() // 设备指纹，用于多设备管理
  })

  if (response.data.success) {
    // 服务器返回的token，本地保存用于后续AI请求
    const remoteToken = response.data.token
    // 生成本地token，关联远程token
    const localToken = jwt.sign({ userId: response.data.user.id, remoteToken }, LOCAL_JWT_SECRET)
    res.json({ token: localToken, user: response.data.user })
  } else {
    res.status(401).json({ error: response.data.message })
  }
})
```

### 3.3 AI任务状态同步

AI任务提交到服务器后，通过WebSocket同步任务状态：

```javascript
// 本地后端 services/remoteTaskSync.js
class RemoteTaskSync {
  constructor() {
    this.ws = null
  }

  connect(remoteToken) {
    // 连接远程服务器的WebSocket
    this.ws = new WebSocket(`wss://m.dsface.com/ws?token=${remoteToken}`)
    this.ws.on('message', (data) => {
      const task = JSON.parse(data)
      // 更新本地任务状态
      this.updateLocalTask(task)
    })
  }

  async updateLocalTask(remoteTask) {
    const localTask = await Task.findByPk(remoteTask.localTaskId)
    if (localTask) {
      await localTask.update({
        status: remoteTask.status,
        progress: remoteTask.progress,
        outputUrl: remoteTask.outputUrl,
        errorMessage: remoteTask.errorMessage
      })
      // 通知本地前端
      localWs.broadcast({ type: 'task_update', ...remoteTask })
    }
  }
}
```

## 四、远程服务器端设计

### 4.1 远程API网关

服务器端新增 `routes/remote.js`，专门处理本地客户端的请求：

```javascript
// 服务器后端 routes/remote.js
const router = express.Router()

// 远程认证中间件 - 验证本地客户端传来的token
const remoteAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未授权' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    // 检查用户状态、用量等
    const user = await User.findByPk(decoded.userId)
    if (!user || user.status === 'disabled') {
      return res.status(403).json({ error: '账号已被禁用' })
    }
    req.user = user
    next()
  } catch (e) {
    return res.status(401).json({ error: '认证失败' })
  }
}

// AI视频生成
router.post('/generate-video', remoteAuthMiddleware, async (req, res) => {
  // 1. 用量检查
  const usage = await checkUsage(req.user.id)
  if (usage.exceeded) return res.status(429).json({ error: '用量已达上限' })

  // 2. 调用RunningHub（API Key在服务器端，不暴露给客户端）
  const result = await audioService.generateImageToVideo({
    ...req.body,
    userId: req.user.id
  })

  // 3. 记录用量
  await recordUsage(req.user.id, 'generate-video', result)

  res.json(result)
})

// 登录验证
router.post('/login', async (req, res) => {
  const { username, password, deviceId } = req.body
  // 验证用户 + 设备绑定检查
  // ...
})
```

### 4.2 用量统计与计费

```javascript
// 服务器后端 services/usageService.js
class UsageService {
  async checkUsage(userId) {
    const user = await User.findByPk(userId)
    const plan = await Subscription.findOne({ where: { userId } })
    const currentMonth = await Usage.sum('cost', {
      where: {
        userId,
        createdAt: { [Op.gte]: startOfMonth() }
      }
    })
    return {
      used: currentMonth,
      limit: plan.monthlyLimit,
      exceeded: currentMonth >= plan.monthlyLimit
    }
  }

  async recordUsage(userId, type, result) {
    await Usage.create({
      userId,
      type,
      cost: result.cost || 0,
      consumeCoins: result.consumeCoins || 0,
      consumeMoney: result.consumeMoney || 0,
      taskCostTime: result.taskCostTime || 0,
      metadata: result.metadata || {}
    })
  }
}
```

## 五、本地媒体文件处理

AI任务需要上传本地媒体文件到服务器，有两种方案：

### 方案A：临时上传（推荐）

本地文件临时上传到服务器，AI处理完成后服务器自动清理：

```
1. 本地选择图片/视频
2. 上传到服务器临时存储（/tmp/remote-tasks/）
3. 服务器调用RunningHub处理
4. 结果返回本地，服务器删除临时文件
```

### 方案B：直传RunningHub

本地后端获取服务器签名的临时凭证，直接上传到RunningHub：

```
1. 本地向服务器请求上传凭证
2. 服务器返回RunningHub临时上传URL
3. 本地直传文件到RunningHub
4. 服务器提交任务到RunningHub
```

## 六、Electron打包结构

### 6.1 安装包内容

```
拾光引擎-Setup-1.0.0.exe    (~400MB)
├── 拾光引擎.exe             (Electron主程序)
├── resources/
│   ├── app.asar             (前端代码 - 复用在线版PC前端)
│   ├── backend/             (后端代码 + node_modules)
│   ├── node.exe             (独立Node运行时)
│   └── ffmpeg/              (ffmpeg静态编译)
└── 用户数据 (安装后自动创建)
    ├── %AppData%/拾光引擎/
    │   ├── data/database.sqlite    (本地数据库)
    │   ├── media/                  (媒体文件)
    │   │   ├── assets/voices/
    │   │   ├── assets/portraits/
    │   │   ├── assets/works/
    │   │   └── output/
    │   └── logs/
```

### 6.2 Electron主进程改造

```javascript
// 改造前：加载桌面端独立前端
mainWindow.loadFile(indexPath)

// 改造后：加载本地后端托管的在线版前端
mainWindow.loadURL(`http://localhost:${actualBackendPort}/`)
```

### 6.3 前端构建

复用在线版PC前端（`packages/frontend-pc`），构建后放入后端的 `frontend/pc` 目录，由Express托管：

```bash
# 构建PC前端
cd packages/frontend-pc && npm run build

# 复制到后端frontend目录
cp -r dist/ ../backend/frontend/pc/

# Electron打包时，backend目录作为extraResources打包
```

## 七、功能分层

| 层级 | 功能 | 依赖 | 联网要求 |
|------|------|------|---------|
| **核心层** | 素材库管理、视频剪辑、文件管理 | Node.js + ffmpeg + SQLite | 离线可用 |
| **认证层** | 登录、注册、设备绑定 | 远程服务器 | 需联网 |
| **AI层** | 视频生成、配音、文案、字幕 | 远程服务器 + RunningHub | 需联网 |
| **扩展层** | 视频自动发布（抖音/B站等） | 本地Chromium + Python | 离线可用 |

## 八、安全设计

1. **API Key不暴露** — RunningHub/SiliconFlow密钥只在服务器端，客户端永远拿不到
2. **Token双签** — 本地token关联远程token，AI请求必须携带有效远程token
3. **设备绑定** — 一个账号最多绑定N台设备，防止共享账号
4. **用量管控** — 服务器统计每个用户的AI调用次数/费用，可设月度上限
5. **数据隐私** — 媒体文件、素材库等敏感数据都在本地，不上传服务器（AI处理时临时上传）
6. **通信加密** — 本地与服务器之间HTTPS + WSS加密传输

## 九、离线模式

| 功能 | 离线状态 | 说明 |
|------|---------|------|
| 素材库管理 | ✅ 可用 | 纯本地操作 |
| 视频剪辑 | ✅ 可用 | 本地ffmpeg |
| AI生成 | ❌ 不可用 | 需要服务器代理 |
| 登录 | ❌ 不可用 | 需要服务器验证 |
| 视频发布 | ✅ 可用 | 本地chromium |

离线时前端应隐藏或禁用AI相关按钮，提示用户需要联网。

## 十、自动更新

1. **前端更新** — 随Electron包一起发布，通过electron-updater自动更新
2. **后端更新** — 随Electron包一起发布，更新时需重启后端子进程
3. **服务器端更新** — 独立部署，客户端无感知

## 十一、开发计划

### Phase 1：基础架构
- [ ] Electron主进程改造（加载本地后端前端）
- [ ] 本地后端添加远程代理层
- [ ] 服务器端添加远程API网关
- [ ] 登录认证代理

### Phase 2：AI代理
- [ ] AI视频生成代理
- [ ] AI配音生成代理
- [ ] AI文案生成代理
- [ ] 任务状态WebSocket同步
- [ ] 本地媒体文件临时上传

### Phase 3：打包与分发
- [ ] ffmpeg静态编译集成
- [ ] sqlite3原生模块rebuild
- [ ] electron-builder配置
- [ ] Windows安装包测试
- [ ] Mac DMG测试

### Phase 4：运营功能
- [ ] 用量统计与计费
- [ ] 设备绑定管理
- [ ] 离线模式UI适配
- [ ] 自动更新测试
