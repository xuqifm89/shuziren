const getApiBase = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/\/api$/, '')
  }
  return ''
}

const getFullApiUrl = (path) => {
  const base = getApiBase()
  if (path.startsWith('http') || path.startsWith('local-media://')) return path
  return `${base}${path}`
}

export { getApiBase, getFullApiUrl }
export default getApiBase
