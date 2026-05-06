const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

let _cachedFfmpegPath = null;
let _cachedFfprobePath = null;

function getFfmpegPath() {
  if (_cachedFfmpegPath !== null) return _cachedFfmpegPath;

  const searchPaths = [
    path.join(__dirname, '..', 'ffmpeg'),
    path.join(__dirname, '..', '..', '..', 'ffmpeg'),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      _cachedFfmpegPath = p;
      return p;
    }
  }

  try {
    execSync('which ffmpeg', { stdio: 'pipe' });
    _cachedFfmpegPath = 'ffmpeg';
  } catch (e) {
    _cachedFfmpegPath = null;
  }

  return _cachedFfmpegPath;
}

function getFfprobePath() {
  if (_cachedFfprobePath !== null) return _cachedFfprobePath;

  const searchPaths = [
    path.join(__dirname, '..', 'ffprobe'),
    path.join(__dirname, '..', '..', '..', 'ffprobe'),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      _cachedFfprobePath = p;
      return p;
    }
  }

  try {
    execSync('which ffprobe', { stdio: 'pipe' });
    _cachedFfprobePath = 'ffprobe';
  } catch (e) {
    const ffmpegPath = getFfmpegPath();
    if (ffmpegPath && ffmpegPath !== 'ffmpeg') {
      const probePath = path.join(path.dirname(ffmpegPath), 'ffprobe');
      if (fs.existsSync(probePath)) {
        _cachedFfprobePath = probePath;
        return probePath;
      }
      try {
        fs.symlinkSync(ffmpegPath, probePath);
        _cachedFfprobePath = probePath;
      } catch (e2) {
        _cachedFfprobePath = 'ffprobe';
      }
    } else {
      _cachedFfprobePath = 'ffprobe';
    }
  }

  return _cachedFfprobePath;
}

function clearCache() {
  _cachedFfmpegPath = null;
  _cachedFfprobePath = null;
}

module.exports = { getFfmpegPath, getFfprobePath, clearCache };
