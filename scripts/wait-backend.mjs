/**
 * Attend que le backend écoute sur PORT (.env racine), puis lance Vite.
 */
import { config } from 'dotenv'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import waitOn from 'wait-on'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(root, '.env') })

const port = process.env.PORT || '3001'
const resource = `tcp:127.0.0.1:${port}`

console.log(`[dev] attente du backend sur ${resource}…`)

await waitOn({
  resources: [resource],
  timeout: 60_000,
  interval: 200,
  window: 500,
})

console.log('[dev] backend prêt, démarrage Vite')

const child = spawn('npm', ['run', 'dev'], {
  cwd: join(root, 'frontend'),
  stdio: 'inherit',
  shell: true,
})

child.on('exit', (code) => process.exit(code ?? 0))
