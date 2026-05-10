import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  base: '/admin/',
  plugins: [
    vue()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: ['@shuziren/shared-components', 'dayjs']
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'element-plus': ['element-plus'],
          'shared-components': ['@shuziren/shared-components'],
          'axios': ['axios']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  server: {
    port: 5174,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true
      },
      '/assets': {
        target: process.env.VITE_DEV_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true
      },
      '/output': {
        target: process.env.VITE_DEV_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
