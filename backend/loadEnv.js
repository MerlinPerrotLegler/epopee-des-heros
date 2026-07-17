/**
 * Charge `.env` depuis la racine du projet, quel que soit le cwd au lancement.
 * Importer ce module en premier dans server.js (avant paths, database, etc.).
 */
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const backendRoot = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = join(backendRoot, '..')

config({ path: join(PROJECT_ROOT, '.env') })
