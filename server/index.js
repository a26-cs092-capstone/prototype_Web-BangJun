import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seed } from './db.js'
import { api } from './api.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const dist = path.join(root, 'web', 'dist')

const info = seed()
console.log(`[kedai] database ready: ${info.materials} bahan, ${info.transactions} transaksi${info.seeded ? ' (seeded)' : ''}`)

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))
app.use('/api/v1', api)
app.use('/api/health', (req, res) => res.json({ ok: true }))

if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint tidak ditemukan.' })
    res.sendFile(path.join(dist, 'index.html'))
  })
} else {
  app.get('/', (req, res) => res.send('Jalankan `npm run build --prefix web` dulu untuk membuat frontend.'))
}

app.use((err, req, res, next) => {
  console.error('[kedai] error', err)
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' })
})

const port = Number(process.env.PORT || 3000)
app.listen(port, '0.0.0.0', () => console.log(`[kedai] listening on http://localhost:${port}`))
