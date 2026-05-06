const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIME_TYPES = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
  '.json': 'application/json', '.pdf': 'application/pdf',
  '.txt': 'text/plain', '.srt': 'text/plain', '.vtt': 'text/vtt'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFileWithRange(req, res, filePath, options = {}) {
  const { maxAge = 3600, enableCaching = true } = options;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = getMimeType(filePath);
  const lastModified = stat.mtime.toUTCString();

  if (enableCaching) {
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince && new Date(ifModifiedSince) >= stat.mtime) {
      return res.status(304).end();
    }

    const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).end();
    }

    res.set('ETag', etag);
    res.set('Last-Modified', lastModified);
    res.set('Cache-Control', `public, max-age=${maxAge}`);
  }

  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);

    if (isNaN(start) || start < 0 || start >= fileSize) {
      res.set('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }

    const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.status(206);
    res.set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: '文件读取失败' });
      }
    });
  } else {
    res.set({
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: '文件读取失败' });
      }
    });
  }
}

function staticFileMiddleware(baseDir, options = {}) {
  return (req, res, next) => {
    const filename = req.params.filename || req.params[0];
    if (!filename) return next();

    const filePath = path.join(baseDir, path.basename(filename));

    if (!filePath.startsWith(path.resolve(baseDir))) {
      return res.status(403).json({ error: '禁止访问' });
    }

    serveFileWithRange(req, res, filePath, options);
  };
}

module.exports = {
  serveFileWithRange,
  staticFileMiddleware,
  getMimeType,
  MIME_TYPES
};
