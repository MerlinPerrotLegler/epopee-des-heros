import { Router } from 'express'
import { getDb } from '../db/database.js'
import { getMediaForServe } from '../services/mediaStorage.js'

const router = Router()

router.get('/:filename', async (req, res) => {
  const { filename } = req.params
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).type('text/plain').send('Invalid filename')
  }

  const db = getDb()
  const result = await getMediaForServe(db, filename)
  if (!result) {
    return res.status(404).type('text/plain').send('Not found')
  }

  res.setHeader('Content-Type', result.mime_type)
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.send(result.buffer)
})

export default router
