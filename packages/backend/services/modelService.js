const fs = require('fs');
const path = require('path');
const axios = require('axios');

let currentMode = 'local';

const models = {
  whisper: { name: 'Whisper', status: 'not_downloaded', size: '~1GB' },
  llm: { name: 'LLM', status: 'not_downloaded', size: '~10GB' },
  tts: { name: 'VibeVoice', status: 'not_downloaded', size: '~5GB' },
  avatar: { name: 'InfiniteTalk', status: 'not_downloaded', size: '~8GB' }
};

async function getModelStatus() {
  const modelDir = './models';
  
  if (fs.existsSync(modelDir)) {
    const files = fs.readdirSync(modelDir);
    
    if (files.includes('whisper')) {
      models.whisper.status = 'downloaded';
    }
    if (files.includes('llm')) {
      models.llm.status = 'downloaded';
    }
    if (files.includes('tts')) {
      models.tts.status = 'downloaded';
    }
    if (files.includes('avatar')) {
      models.avatar.status = 'downloaded';
    }
  }
  
  return {
    currentMode,
    models
  };
}

async function switchModelMode(mode) {
  if (mode !== 'local' && mode !== 'cloud') {
    throw new Error('Invalid mode. Must be "local" or "cloud"');
  }
  
  currentMode = mode;
  return { success: true, mode };
}

async function downloadModel(modelName) {
  if (!models[modelName]) {
    throw new Error('Model not found');
  }
  
  const modelDir = `./models/${modelName}`;
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  
  models[modelName].status = 'downloading';
  
  try {
    const response = await axios({
      url: `${process.env.CLOUD_API_URL}/models/download/${modelName}`,
      method: 'GET',
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(path.join(modelDir, `${modelName}.bin`));
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        models[modelName].status = 'downloaded';
        resolve({ success: true, modelName });
      });
      writer.on('error', (err) => {
        models[modelName].status = 'failed';
        reject(err);
      });
    });
  } catch (error) {
    models[modelName].status = 'failed';
    throw error;
  }
}

module.exports = { getModelStatus, switchModelMode, downloadModel };