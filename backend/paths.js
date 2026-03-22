import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

/**
 * Dossier des données persistantes (SQLite, uploads, seeds copiés).
 * En production sur hébergeur à disque éphémère : définir DATA_DIR vers un volume monté
 * (ex. /var/lib/card-designer/data) pour que la base survive aux redéploiements.
 */
const backendRoot = dirname(fileURLToPath(import.meta.url))

export const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : join(backendRoot, 'data')
