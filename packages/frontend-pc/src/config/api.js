export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const API_ENDPOINTS = {
  auth: `${API_BASE}/users`,
  users: `${API_BASE}/users`,
  audio: `${API_BASE}/audio`,
  video: `${API_BASE}/video`,
  text: `${API_BASE}/text`,
  clips: `${API_BASE}/clips`,
  voiceLibrary: `${API_BASE}/voice-library`,
  dubbingLibrary: `${API_BASE}/dubbing-library`,
  musicLibrary: `${API_BASE}/music-library`,
  portraitLibrary: `${API_BASE}/portrait-library`,
  copyLibrary: `${API_BASE}/copy-library`,
  promptLibrary: `${API_BASE}/prompt-library`,
  workLibrary: `${API_BASE}/work-library`,
  publish: `${API_BASE}/publish`,
  cloudConfig: `${API_BASE}/cloud-config`,
  apiLogs: `${API_BASE}/api-logs`,
  models: `${API_BASE}/models`,
  runninghub: `${API_BASE}/runninghub`,
  ws: `${API_BASE}/ws`
}
