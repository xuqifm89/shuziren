import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

const isDocker = process.env.DOCKER_ENV === 'true'
const backendUrl = process.env.VITE_DEV_BACKEND_URL || (isDocker ? 'http://backend-dev:3001' : 'http://localhost:3001')

console.log('[vite.config] DOCKER_ENV:', process.env.DOCKER_ENV, 'backendUrl:', backendUrl)

export default defineConfig({
  plugins: [uni()],
  server: {
    port: 5175,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[proxy error]', err.message)
          })
          proxy.on('proxyReq', (proxyReq) => {
            console.log('[proxy]', proxyReq.method, proxyReq.path, '→', backendUrl)
          })
        }
      },
      '/assets': {
        target: backendUrl,
        changeOrigin: true
      },
      '/output': {
        target: backendUrl,
        changeOrigin: true
      },
      '/ws': {
        target: backendUrl.replace('http', 'ws'),
        ws: true
      }
    }
  }
})
