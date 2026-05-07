import { app, BrowserWindow, shell, ipcMain, dialog, protocol, Tray, Menu, nativeImage } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater
import { fileURLToPath } from 'url'
import { exec, spawn } from 'child_process'
import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync, statSync as fsStat, createReadStream, writeFileSync, readFileSync, unlinkSync, renameSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let backendProcess = null
let tray = null
let isQuitting = false

const BACKEND_PORT = 3001

function log(msg) {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`[${timestamp}] ${msg}`)
}

function getUserDataDir() {
  const userDataPath = app.getPath('userData')
  return userDataPath
}

function getMediaDir() {
  const mediaDir = join(getUserDataDir(), 'media')
  if (!existsSync(mediaDir)) {
    mkdirSync(mediaDir, { recursive: true })
  }
  return mediaDir
}

function getLocalDbPath() {
  const dataDir = join(getUserDataDir(), 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  return join(dataDir, 'database.sqlite')
}

function getOfflineQueuePath() {
  const dataDir = join(getUserDataDir(), 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  return join(dataDir, 'offline-queue.json')
}

function getBackendDir() {
  if (is.dev) {
    return join(__dirname, '../../packages/backend')
  }
  return join(process.resourcesPath || '', 'backend')
}

function getNodeExePath() {
  if (is.dev) {
    return 'node'
  }

  if (process.platform === 'win32') {
    const bundledNode = join(process.resourcesPath || '', 'node.exe')
    if (existsSync(bundledNode)) {
      return bundledNode
    }
  }

  return process.execPath
}

async function checkPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -an | findstr ":${port}.*LISTENING"`, (error) => {
        resolve(!error)
      })
    } else {
      exec(`lsof -i :${port} | grep LISTEN`, (error) => {
        resolve(!error)
      })
    }
  })
}

async function findAvailablePort(startPort) {
  let port = startPort
  while (port < startPort + 100) {
    const inUse = await checkPort(port)
    if (!inUse) return port
    port++
  }
  return startPort
}

let actualBackendPort = BACKEND_PORT

async function startBackend() {
  const isDev = is.dev && process.env['ELECTRON_RENDERER_URL']

  if (isDev) {
    log('开发模式 - 请手动启动后端 (cd packages/backend && node server.js)')
    return true
  }

  const backendDir = getBackendDir()
  const serverJs = join(backendDir, 'server.js')
  const nodeExe = getNodeExePath()

  const useElectronAsNode = (nodeExe === process.execPath)

  log('🚀 启动后端服务...')
  log('   后端目录: ' + backendDir)
  log('   入口文件: ' + serverJs)
  log('   Node运行时: ' + nodeExe)

  if (!existsSync(serverJs)) {
    log('❌ server.js 不存在: ' + serverJs)
    return false
  }

  actualBackendPort = await findAvailablePort(BACKEND_PORT)
  log('   使用端口: ' + actualBackendPort)

  return new Promise((resolve) => {
    const dbPath = getLocalDbPath()
    const mediaDir = getMediaDir()

    const bundledDb = join(backendDir, 'data', 'database.sqlite')
    let needMigrate = false

    if (!existsSync(dbPath)) {
      needMigrate = true
    } else {
      try {
        const dbStat = statSync(dbPath)
        if (dbStat.size < 10240) {
          needMigrate = true
        }
      } catch (e) {
        needMigrate = true
      }
    }

    if (needMigrate && existsSync(bundledDb)) {
      copyFileSync(bundledDb, dbPath)
      log('📋 迁移数据库: ' + bundledDb + ' -> ' + dbPath)
    }

    log('💾 数据库路径: ' + dbPath)
    log('📁 媒体目录: ' + mediaDir)

    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(actualBackendPort),
      DB_DIALECT: 'sqlite',
      DB_PATH: dbPath,
      LOCAL_MEDIA_PATH: mediaDir
    }

    if (useElectronAsNode) {
      env.ELECTRON_RUN_AS_NODE = '1'
    }

    backendProcess = spawn(nodeExe, [serverJs], {
      cwd: backendDir,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: false
    })

    let started = false

    backendProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim()
      if (msg) {
        log('   [后端] ' + msg)
        if (!started && (msg.includes('running on port') || msg.includes('Server running'))) {
          started = true
          log('✅ 后端就绪!')
          resolve(true)
        }
      }
    })

    backendProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim()
      if (msg && !msg.includes('DeprecationWarning') && !msg.includes('(node:')) {
        log('   [后端] ' + msg)
      }
    })

    backendProcess.on('error', (err) => {
      log('❌ 后端启动失败: ' + err.message)
      resolve(false)
    })

    backendProcess.on('exit', (code) => {
      log('🔴 后端进程退出 (code=' + code + ')')
      backendProcess = null
    })

    setTimeout(async () => {
      if (!started) {
        const ready = await checkPort(actualBackendPort)
        if (ready) {
          log('✅ 端口 ' + actualBackendPort + ' 就绪')
          resolve(true)
        } else {
          log('⚠️  后端可能未完全启动，继续打开前端')
          resolve(true)
        }
      }
    }, 10000)
  })
}

function stopBackend() {
  if (backendProcess) {
    log('🛑 停止后端服务...')
    backendProcess.kill()
    backendProcess = null
  }
}

function createTray() {
  let iconPath
  if (is.dev) {
    iconPath = join(__dirname, '../resources/icon.png')
  } else {
    iconPath = join(process.resourcesPath || '', 'icon.png')
  }

  let trayIcon
  if (existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (process.platform === 'darwin') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
    }
  } else {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '检查更新',
      click: () => {
        if (!is.dev) {
          autoUpdater.checkForUpdates()
        }
      }
    },
    { type: 'separator' },
    {
      label: '打开媒体目录',
      click: () => {
        shell.openPath(getMediaDir())
      }
    },
    {
      label: '打开数据目录',
      click: () => {
        shell.openPath(join(getUserDataDir(), 'data'))
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('拾光引擎 - 数字人视频生成系统')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function setupAutoLaunch() {
  const appFolder = path.dirname(process.execPath)
  const appExe = path.basename(process.execPath)
  const isAutoLaunch = app.getLoginItemSettings().openAtLogin

  ipcMain.handle('get-auto-launch', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('set-auto-launch', (event, enable) => {
    if (is.dev) return false
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath
    })
    return true
  })
}

function createMainWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      show: false,
      autoHideMenuBar: true,
      title: '拾光引擎 v1.0.0',
      icon: join(__dirname, '../resources/icon.png'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow.show()
    })

    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault()
        mainWindow.hide()
        if (process.platform === 'darwin') {
          app.dock?.hide()
        }
      }
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      const indexPath = join(__dirname, '../dist/index.html')
      mainWindow.loadFile(indexPath)
    }

    return mainWindow

  } catch (error) {
    log('❌ 创建窗口失败: ' + error.message)
    throw error
  }
}

function getOfflineQueue() {
  const queuePath = getOfflineQueuePath()
  try {
    if (existsSync(queuePath)) {
      const data = readFileSync(queuePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {}
  return []
}

function saveOfflineQueue(queue) {
  const queuePath = getOfflineQueuePath()
  try {
    writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf-8')
  } catch (e) {
    log('❌ 保存离线队列失败: ' + e.message)
  }
}

function addToOfflineQueue(action) {
  const queue = getOfflineQueue()
  queue.push({
    ...action,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  })
  saveOfflineQueue(queue)
  log('📝 添加到离线队列: ' + action.type)
}

async function processOfflineQueue() {
  const queue = getOfflineQueue()
  if (queue.length === 0) return 0

  log('📤 处理离线队列: ' + queue.length + ' 条')

  const baseUrl = `http://localhost:${actualBackendPort}`
  let processed = 0

  for (const item of queue) {
    try {
      const token = item.token || ''
      const response = await fetch(`${baseUrl}${item.url}`, {
        method: item.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: item.body ? JSON.stringify(item.body) : undefined
      })

      if (response.ok) {
        processed++
        log('   ✅ 同步成功: ' + item.type)
      } else {
        log('   ⚠️ 同步失败: ' + item.type + ' (HTTP ' + response.status + ')')
      }
    } catch (e) {
      log('   ❌ 同步异常: ' + item.type + ' - ' + e.message)
    }
  }

  if (processed > 0) {
    const remaining = queue.slice(processed)
    saveOfflineQueue(remaining)
    log('📤 离线队列处理完成: ' + processed + '/' + queue.length)
  }

  return processed
}

app.whenReady().then(async () => {
  try {
    app.setAppUserModelId('com.shuziren.app')

    if (process.platform === 'darwin') {
      app.dock?.show()
    }

    protocol.handle('local-media', (request) => {
      const filePath = decodeURIComponent(request.url.replace('local-media://', ''))
      const resolvedPath = path.normalize(filePath)
      if (!existsSync(resolvedPath)) {
        return new Response('Not Found', { status: 404 })
      }
      const ext = path.extname(resolvedPath).toLowerCase()
      const mimeTypes = {
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
        '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp'
      }
      const mimeType = mimeTypes[ext] || 'application/octet-stream'
      return new Response(createReadStream(resolvedPath), {
        headers: { 'Content-Type': mimeType, 'Accept-Ranges': 'bytes' }
      })
    })

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.on('ping', () => console.log('pong'))

    log('========================================')
    log('🎬 拾光引擎 v1.0.0')
    log('========================================')
    log('平台: ' + process.platform)
    log('Electron: ' + process.versions.electron)
    log('Node.js: ' + process.versions.node)
    log('用户数据: ' + getUserDataDir())
    log('')

    log('[自动] 正在启动后端服务...')
    await startBackend()

    log('')
    log('[自动] 创建前端界面...')
    createMainWindow()

    createTray()
    setupAutoLaunch()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      } else {
        mainWindow?.show()
      }
    })

    log('')
    log('✅ 应用启动完成!')

    setupAutoUpdater()

    if (!is.dev) {
      setTimeout(() => {
        log('🔄 自动检查更新...')
        autoUpdater.checkForUpdates()
      }, 5000)
    }

    setTimeout(async () => {
      const processed = await processOfflineQueue()
      if (processed > 0) {
        sendToRenderer('offline-sync', { processed, total: processed })
      }
    }, 3000)

  } catch (error) {
    log('❌ 启动失败: ' + error.message)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!isQuitting) {
      isQuitting = true
      stopBackend()
      app.quit()
    }
  }
})

app.on('before-quit', () => {
  isQuitting = true
  stopBackend()
  if (tray) {
    tray.destroy()
    tray = null
  }
})

ipcMain.handle('get-app-path', () => {
  return getUserDataDir()
})

ipcMain.handle('get-media-dir', () => {
  return getMediaDir()
})

ipcMain.handle('get-backend-url', () => {
  return `http://localhost:${actualBackendPort}`
})

ipcMain.handle('select-file', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || '选择文件',
    properties: ['openFile'],
    filters: options.filters || [
      { name: '视频文件', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac'] },
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  return {
    path: filePath,
    name: path.basename(filePath),
    size: fsStat(filePath).size,
    ext: path.extname(filePath).toLowerCase(),
    localMediaUrl: `local-media://${filePath}`
  }
})

ipcMain.handle('select-directory', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || '选择目录',
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('list-directory', async (event, dirPath, options = {}) => {
  try {
    if (!existsSync(dirPath)) return []
    const entries = readdirSync(dirPath, { withFileTypes: true })
    return entries
      .filter(e => options.filesOnly ? e.isFile() : true)
      .filter(e => options.extensions ? options.extensions.includes(path.extname(e.name).toLowerCase()) : true)
      .map(e => ({
        name: e.name,
        path: join(dirPath, e.name),
        isFile: e.isFile(),
        isDirectory: e.isDirectory(),
        size: e.isFile() ? fsStat(join(dirPath, e.name)).size : 0,
        localMediaUrl: e.isFile() ? `local-media://${join(dirPath, e.name)}` : null
      }))
  } catch (err) {
    return []
  }
})

ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    if (!existsSync(filePath)) return null
    const stats = fsStat(filePath)
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      ext: path.extname(filePath).toLowerCase(),
      modifiedAt: stats.mtime.toISOString(),
      localMediaUrl: `local-media://${filePath}`
    }
  } catch (err) {
    return null
  }
})

ipcMain.handle('to-local-media-url', async (event, filePath) => {
  if (!filePath) return null
  return `local-media://${filePath}`
})

ipcMain.handle('copy-to-media-dir', async (event, sourcePath, subDir = '') => {
  try {
    if (!existsSync(sourcePath)) return null

    const targetDir = subDir ? join(getMediaDir(), subDir) : getMediaDir()
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    const fileName = path.basename(sourcePath)
    let targetPath = join(targetDir, fileName)

    if (existsSync(targetPath)) {
      const ext = path.extname(fileName)
      const base = path.basename(fileName, ext)
      targetPath = join(targetDir, `${base}_${Date.now()}${ext}`)
    }

    copyFileSync(sourcePath, targetPath)

    return {
      originalPath: sourcePath,
      localPath: targetPath,
      localMediaUrl: `local-media://${targetPath}`,
      size: fsStat(targetPath).size
    }
  } catch (err) {
    log('❌ 复制文件失败: ' + err.message)
    return null
  }
})

ipcMain.handle('add-offline-action', async (event, action) => {
  addToOfflineQueue(action)
  return true
})

ipcMain.handle('get-offline-queue', async () => {
  return getOfflineQueue()
})

ipcMain.handle('process-offline-queue', async () => {
  return await processOfflineQueue()
})

ipcMain.handle('clear-offline-queue', async () => {
  saveOfflineQueue([])
  return true
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    appVersion: app.getVersion(),
    userDataDir: getUserDataDir(),
    mediaDir: getMediaDir(),
    dbPath: getLocalDbPath(),
    backendPort: actualBackendPort
  }
})

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    log('🔄 正在检查更新...')
    sendToRenderer('update-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    log('📦 发现新版本: ' + info.version)
    sendToRenderer('update-status', { status: 'available', version: info.version, releaseNotes: info.releaseNotes })

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 v${info.version}，是否立即下载？`,
      buttons: ['下载更新', '稍后提醒'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })

  autoUpdater.on('update-not-available', () => {
    log('✅ 已是最新版本')
    sendToRenderer('update-status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progressInfo) => {
    const percent = Math.round(progressInfo.percent)
    log(`📥 下载进度: ${percent}%`)
    sendToRenderer('update-status', {
      status: 'downloading',
      progress: percent,
      speed: Math.round(progressInfo.bytesPerSecond / 1024) + ' KB/s'
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log('✅ 更新已下载完成')
    sendToRenderer('update-status', { status: 'downloaded', version: info.version })

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: '新版本已下载完成，重启应用以完成安装？',
      buttons: ['立即重启', '稍后安装'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })

  autoUpdater.on('error', (err) => {
    log('❌ 更新错误: ' + err.message)
    sendToRenderer('update-status', { status: 'error', error: err.message })
  })

  ipcMain.handle('check-for-updates', () => {
    if (is.dev) {
      log('⚠️ 开发模式下不支持自动更新')
      return { status: 'dev-mode' }
    }
    return autoUpdater.checkForUpdates()
  })

  ipcMain.handle('download-update', () => {
    return autoUpdater.downloadUpdate()
  })

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}
