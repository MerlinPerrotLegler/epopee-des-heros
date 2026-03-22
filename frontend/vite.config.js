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
      // Objet explicite : meilleure transmission Set-Cookie / Cookie avec express-session
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
