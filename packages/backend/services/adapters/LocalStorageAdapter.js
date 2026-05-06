const fs = require('fs');
const path = require('path');
const { LOCAL_BASE_PATH, STORAGE_CATEGORIES } = require('../../config/storage');

class LocalStorageAdapter {
  constructor() {
    this.basePath = path.resolve(LOCAL_BASE_PATH);
    this._ensureDirectories();
  }

  _ensureDirectories() {
    for (const [, config] of Object.entries(STORAGE_CATEGORIES)) {
      const dir = path.join(this.basePath, config.dir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async save(category, fileName, data) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) throw new Error(`Unknown storage category: ${category}`);

    const dir = path.join(this.basePath, config.dir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);
    if (Buffer.isBuffer(data)) {
      fs.writeFileSync(filePath, data);
    } else if (typeof data === 'string') {
      fs.writeFileSync(filePath, data, 'utf-8');
    } else if (data instanceof fs.ReadStream) {
      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(filePath);
        data.pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
      });
    } else {
      fs.writeFileSync(filePath, JSON.stringify(data));
    }

    return {
      success: true,
      fileKey: `${config.dir}/${fileName}`,
      filePath,
      url: `/assets/${config.dir}/${fileName}`,
      size: fs.statSync(filePath).size
    };
  }

  async read(category, fileName) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) throw new Error(`Unknown storage category: ${category}`);

    const filePath = path.join(this.basePath, config.dir, fileName);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    return {
      success: true,
      filePath,
      stream: fs.createReadStream(filePath),
      size: fs.statSync(filePath).size
    };
  }

  async delete(category, fileName) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) throw new Error(`Unknown storage category: ${category}`);

    const filePath = path.join(this.basePath, config.dir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return { success: true };
  }

  async exists(category, fileName) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) return false;

    const filePath = path.join(this.basePath, config.dir, fileName);
    return fs.existsSync(filePath);
  }

  async list(category, options = {}) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) throw new Error(`Unknown storage category: ${category}`);

    const dir = path.join(this.basePath, config.dir);
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir);
    return files.map(name => {
      const filePath = path.join(dir, name);
      const stat = fs.statSync(filePath);
      return {
        name,
        size: stat.size,
        modified: stat.mtime,
        url: `/assets/${config.dir}/${name}`
      };
    });
  }

  getUrl(category, fileName) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) return null;
    return `/assets/${config.dir}/${fileName}`;
  }

  getFilePath(category, fileName) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) return null;
    return path.join(this.basePath, config.dir, fileName);
  }
}

module.exports = LocalStorageAdapter;
