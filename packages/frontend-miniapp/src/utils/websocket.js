const BASE_URL = 'ws://localhost:3001'

export function createWebSocket(path = '/ws') {
  return new Promise((resolve, reject) => {
    const ws = uni.connectSocket({ url: `${BASE_URL}${path}`, complete: () => {} })
    ws.onOpen(() => { console.log('WebSocket connected'); resolve(ws) })
    ws.onError((err) => { console.error('WebSocket error:', err); reject(err) })
    ws.onClose(() => { console.log('WebSocket closed') })
  })
}

export function getTaskWebSocket() {
  return createWebSocket('/ws')
}
