import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const frontendRoot = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(frontendRoot, '..')

export default defineConfig(({ mode }) => {
  // Lit PORT depuis la racine du projet (.env) — pas de port backend codé en dur
  const env = loadEnv(mode, projectRoot, '')
  const backendPort = env.PORT || '3001'
  const backendTarget = `http://127.0.0.1:${backendPort}`

  return {
    plugins: [vue()],
    optimizeDeps: {
      // @imgly/background-removal uses dynamic imports + WASM workers internally
      exclude: ['@imgly/background-removal'],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  }
})
