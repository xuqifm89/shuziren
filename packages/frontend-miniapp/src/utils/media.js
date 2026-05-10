function getOrigin() {
  // #ifdef H5
  if (typeof location !== 'undefined' && location.origin) return location.origin
  // #endif
  return ''
}

function convertToMp3(resolved) {
  const lower = resolved.toLowerCase()
  if (lower.endsWith('.flac') || lower.endsWith('.wav')) {
    const dir = resolved.substring(0, resolved.lastIndexOf('/'))
    const name = resolved.substring(resolved.lastIndexOf('/') + 1)
    const mp3Name = name.replace(/\.(flac|wav)$/i, '.mp3')
    return `${dir}/audio-mp3/${mp3Name}`
  }
  return resolved
}

export function resolveMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  let resolved = url.startsWith('/') ? url : `/${url}`
  resolved = convertToMp3(resolved)
  // #ifdef H5
  const origin = getOrigin()
  if (origin && resolved.startsWith('/')) {
    resolved = origin + resolved
  }
  // #endif
  return resolved
}

export function toRelativePath(url) {
  if (!url) return ''
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const u = new URL(url)
      return u.pathname
    }
  } catch (e) {}
  return url
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
