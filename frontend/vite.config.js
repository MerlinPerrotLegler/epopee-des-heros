import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // @imgly/background-removal uses dynamic imports + WASM workers internally
    exclude: ['@imgly/background-removal'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001'
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
