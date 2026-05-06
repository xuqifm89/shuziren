const path = require('path');
const fs = require('fs');
const { STORAGE_TYPE, STORAGE_CATEGORIES } = require('../config/storage');
const LocalStorageAdapter = require('./adapters/LocalStorageAdapter');
const CloudStorageAdapter = require('./adapters/CloudStorageAdapter');

class FileService {
  constructor() {
    this.localAdapter = new LocalStorageAdapter();
    this.cloudAdapter = new CloudStorageAdapter();
    this.storageType = STORAGE_TYPE;
  }

  _getAdapter(storageLocation) {
    const type = storageLocation || this.storageType;
    return type === 'cloud' ? this.cloudAdapter : this.localAdapter;
  }

  async save(category, fileName, data, options = {}) {
    const storageLocation = options.storageLocation || this.storageType;
    const adapter = this._getAdapter(storageLocation);

    const result = await adapter.save(category, fileName, data);

    if (storageLocation === 'both' || options.syncToCloud) {
      try {
        await this.cloudAdapter.save(category, fileName, data);
      } catch (err) {
        console.warn(`[FileService] Cloud sync failed for ${category}/${fileName}:`, err.message);
      }
    }

    return {
      ...result,
      storageLocation: storageLocation === 'both' ? 'cloud' : storageLocation,
      category
    };
  }

  async read(category, fileName, options = {}) {
    const storageLocation = options.storageLocation || this.storageType;
    const adapter = this._getAdapter(storageLocation);
    return await adapter.read(category, fileName);
  }

  async delete(category, fileName, options = {}) {
    const storageLocation = options.storageLocation || this.storageType;
    const adapter = this._getAdapter(storageLocation);

    const result = await adapter.delete(category, fileName);

    if (storageLocation === 'local' || options.deleteFromCloud) {
      try {
        await this.cloudAdapter.delete(category, fileName);
      } catch (err) {
        console.warn(`[FileService] Cloud delete failed:`, err.message);
      }
    }

    return result;
  }

  async exists(category, fileName, options = {}) {
    const storageLocation = options.storageLocation || this.storageType;
    const adapter = this._getAdapter(storageLocation);
    return await adapter.exists(category, fileName);
  }

  async list(category, options = {}) {
    const storageLocation = options.storageLocation || this.storageType;
    const adapter = this._getAdapter(storageLocation);
    return await adapter.list(category, options);
  }

  getUrl(category, fileName, options = {}) {
    const storageLocation = options.storageLocation || this.storageType;
    const adapter = this._getAdapter(storageLocation);
    return adapter.getUrl(category, fileName);
  }

  getFilePath(category, fileName) {
    return this.localAdapter.getFilePath(category, fileName);
  }

  async saveFromBuffer(category, fileName, buffer, options = {}) {
    return await this.save(category, fileName, buffer, options);
  }

  async saveFromPath(category, sourcePath, options = {}) {
    const fileName = path.basename(sourcePath);
    const data = fs.readFileSync(sourcePath);
    return await this.save(category, fileName, data, options);
  }

  async saveFromStream(category, fileName, stream, options = {}) {
    const adapter = this._getAdapter(options.storageLocation || this.storageType);
    return await adapter.save(category, fileName, stream);
  }

  resolveUrl(fileKey, storageLocation) {
    if (!fileKey) return null;

    if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
      return fileKey;
    }

    if (fileKey.startsWith('/assets/')) {
      return fileKey;
    }

    const adapter = this._getAdapter(storageLocation || this.storageType);
    const parts = fileKey.split('/');
    if (parts.length >= 2) {
      const category = parts[0];
      const fileName = parts.slice(1).join('/');
      return adapter.getUrl(category, fileName);
    }

    return `/assets/${fileKey}`;
  }

  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
  }

  ensureCategoryDir(category) {
    const dirPath = this.localAdapter.getFilePath(category, '');
    return this.ensureDir(dirPath);
  }

  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  fileStats(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return fs.statSync(filePath);
  }

  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (err) {
      console.warn(`[FileService] deleteFile failed:`, err.message);
    }
    return false;
  }

  renameFile(oldPath, newPath) {
    fs.renameSync(oldPath, newPath);
    return newPath;
  }

  writeBuffer(filePath, buffer) {
    const dir = path.dirname(filePath);
    this.ensureDir(dir);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  createWriteStream(filePath) {
    const dir = path.dirname(filePath);
    this.ensureDir(dir);
    return fs.createWriteStream(filePath);
  }

  readDir(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath);
  }

  getStorageInfo() {
    return {
      type: this.storageType,
      categories: Object.keys(STORAGE_CATEGORIES),
      localBasePath: this.localAdapter.basePath,
      cloudBucket: this.cloudAdapter.bucket
    };
  }
}

module.exports = new FileService();
