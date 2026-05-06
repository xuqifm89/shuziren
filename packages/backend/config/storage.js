require('dotenv').config();

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const LOCAL_BASE_PATH = process.env.LOCAL_BASE_PATH || './assets';
const CLOUD_BUCKET = process.env.CLOUD_BUCKET || '';
const CLOUD_REGION = process.env.CLOUD_REGION || '';
const CLOUD_ACCESS_KEY = process.env.CLOUD_ACCESS_KEY || '';
const CLOUD_SECRET_KEY = process.env.CLOUD_SECRET_KEY || '';
const CLOUD_ENDPOINT = process.env.CLOUD_ENDPOINT || '';
const CLOUD_PUBLIC_URL = process.env.CLOUD_PUBLIC_URL || '';

const STORAGE_CATEGORIES = {
  voices: { dir: 'voices', extensions: ['.wav', '.mp3', '.flac', '.ogg'] },
  dubbings: { dir: 'dubbings', extensions: ['.wav', '.mp3', '.flac'] },
  portraits: { dir: 'portraits', extensions: ['.png', '.jpg', '.jpeg', '.webp'] },
  'portraits/videos': { dir: 'portraits/videos', extensions: ['.mp4', '.mov'] },
  works: { dir: 'works', extensions: ['.mp4', '.mov', '.avi'] },
  musics: { dir: 'musics', extensions: ['.mp3', '.wav', '.flac'] },
  temp: { dir: 'temp', extensions: ['*'] },
  uploads: { dir: 'uploads', extensions: ['*'] }
};

module.exports = {
  STORAGE_TYPE,
  LOCAL_BASE_PATH,
  CLOUD_BUCKET,
  CLOUD_REGION,
  CLOUD_ACCESS_KEY,
  CLOUD_SECRET_KEY,
  CLOUD_ENDPOINT,
  CLOUD_PUBLIC_URL,
  STORAGE_CATEGORIES
};
