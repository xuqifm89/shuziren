const { contextBridge, ipcRenderer } = require('electron')

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      platform: process.platform,
      onPing: (callback) => ipcRenderer.on('ping', callback),
      getAppPath: () => ipcRenderer.invoke('get-app-path'),
      getMediaDir: () => ipcRenderer.invoke('get-media-dir'),
      getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
      getAppVersion: () => ipcRenderer.invoke('get-app-version'),
      getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

      selectFile: (options) => ipcRenderer.invoke('select-file', options),
      selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),
      listDirectory: (dirPath, options) => ipcRenderer.invoke('list-directory', dirPath, options),
      getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
      toLocalMediaUrl: (filePath) => ipcRenderer.invoke('to-local-media-url', filePath),
      copyToMediaDir: (sourcePath, subDir) => ipcRenderer.invoke('copy-to-media-dir', sourcePath, subDir),

      getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
      setAutoLaunch: (enable) => ipcRenderer.invoke('set-auto-launch', enable),

      addOfflineAction: (action) => ipcRenderer.invoke('add-offline-action', action),
      getOfflineQueue: () => ipcRenderer.invoke('get-offline-queue'),
      processOfflineQueue: () => ipcRenderer.invoke('process-offline-queue'),
      clearOfflineQueue: () => ipcRenderer.invoke('clear-offline-queue'),

      checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
      downloadUpdate: () => ipcRenderer.invoke('download-update'),
      installUpdate: () => ipcRenderer.invoke('install-update'),

      onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (_, data) => callback(data))
      },
      onOfflineSync: (callback) => {
        ipcRenderer.on('offline-sync', (_, data) => callback(data))
      },

      isElectron: true
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = {
    platform: process.platform,
    isElectron: true,
    getBackendUrl: () => Promise.resolve('http://localhost:3001'),
    selectFile: () => Promise.resolve(null),
    selectDirectory: () => Promise.resolve(null),
    listDirectory: () => Promise.resolve([]),
    getFileInfo: () => Promise.resolve(null),
    toLocalMediaUrl: (p) => Promise.resolve(p ? `local-media://${p}` : null),
    copyToMediaDir: () => Promise.resolve(null),
    getAutoLaunch: () => Promise.resolve(false),
    setAutoLaunch: () => Promise.resolve(false),
    addOfflineAction: () => Promise.resolve(true),
    getOfflineQueue: () => Promise.resolve([]),
    processOfflineQueue: () => Promise.resolve(0),
    clearOfflineQueue: () => Promise.resolve(true),
    getAppVersion: () => Promise.resolve('1.0.0'),
    getSystemInfo: () => Promise.resolve({}),
    checkForUpdates: () => Promise.resolve({ status: 'web-mode' }),
    downloadUpdate: () => Promise.resolve(null),
    installUpdate: () => Promise.resolve(null),
    onUpdateStatus: () => {},
    onOfflineSync: () => {}
  }
}
