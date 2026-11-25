import { Router } from 'express'
import { db, nextId } from './db.js'
import { materialToFE, transactionToFE, TYPE_TO_DB, REASON_TO_DB } from './mapping.js'

export const api = Router()

const fail = (res, status, message) => res.status(status).json({ error: message })
const one = (sql, ...params) => db.prepare(sql).get(...params)
const all = (sql, ...params) => db.prepare(sql).all(...params)

api.get('/materials', (req, res) => {
  const rows = all('SELECT * FROM v_stok_bahan ORDER BY ingredient_id')
  res.json(rows.map(materialToFE))
})

api.get('/materials/:id', (req, res) => {
  const row = one('SELECT * FROM v_stok_bahan WHERE ingredient_id = ?', req.params.id)
  if (!row) return fail(res, 404, 'Bahan baku tidak ditemukan.')
  const history = all(`SELECT * FROM v_riwayat_stok WHERE ingredient_id = ?
    ORDER BY transaction_date DESC, transaction_id DESC LIMIT 20`, req.params.id)
  res.json({ ...materialToFE(row), history: history.map(transactionToFE) })
})

api.post('/materials', (req, res) => {
  const { name, unit, minimumStock } = req.body || {}
  if (!name || !String(name).trim()) return fail(res, 400, 'Nama bahan baku wajib diisi.')
  if (!unit || !String(unit).trim()) return fail(res, 400, 'Satuan wajib dipilih.')
  const min = Number(minimumStock)
  if (!Number.isFinite(min) || min < 0) return fail(res, 400, 'Stok minimum harus angka nonnegatif.')
  const id = nextId('B', 'bahan_baku', 'ingredient_id')
  try {
    db.prepare(`INSERT INTO bahan_baku
      (ingredient_id, ingredient_name, category, item_type, stock_unit, is_stockable,
       data_source, stok_minimum, is_aktif)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      id, String(name).trim(), null, 'INDIVIDUAL', String(unit).trim(), 1, 'APP', min, 1,
    )
  } catch (e) {
    return fail(res, 400, 'Nama bahan baku sudah digunakan.')
  }
  res.status(201).json(materialToFE(one('SELECT * FROM v_stok_bahan WHERE ingredient_id = ?', id)))
})

api.patch('/materials/:id', (req, res) => {
  const row = one('SELECT * FROM bahan_baku WHERE ingredient_id = ?', req.params.id)
  if (!row) return fail(res, 404, 'Bahan baku tidak ditemukan.')
  const name = req.body?.name ?? row.ingredient_name
  const unit = req.body?.unit ?? row.stock_unit
  const minimumStock = req.body?.minimumStock ?? row.stok_minimum
  const active = req.body?.active === undefined ? row.is_aktif : (req.body.active ? 1 : 0)
  if (!name || !String(name).trim()) return fail(res, 400, 'Nama bahan baku wajib diisi.')
  if (!unit || !String(unit).trim()) return fail(res, 400, 'Satuan wajib dipilih.')
  const min = Number(minimumStock)
  if (!Number.isFinite(min) || min < 0) return fail(res, 400, 'Stok minimum tidak valid.')
  db.prepare(`UPDATE bahan_baku SET ingredient_name = ?, stock_unit = ?, stok_minimum = ?,
    is_aktif = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE ingredient_id = ?`)
    .run(String(name).trim(), String(unit).trim(), min, active, req.params.id)
  res.json(materialToFE(one('SELECT * FROM v_stok_bahan WHERE ingredient_id = ?', req.params.id)))
})

api.get('/transactions', (req, res) => {
  const { search = '', type = '', from = '', to = '', page = '1', pageSize = '8' } = req.query
  const where = []
  const params = []
  if (search) { where.push('(LOWER(ingredient_name) LIKE ? OR LOWER(notes) LIKE ?)'); const s = `%${String(search).toLowerCase()}%`; params.push(s, s) }
  if (type) { where.push('transaction_type = ?'); params.push(TYPE_TO_DB[type] || type) }
  if (from) { where.push('transaction_date >= ?'); params.push(String(from)) }
  if (to) { where.push('transaction_date <= ?'); params.push(String(to)) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = one(`SELECT COUNT(*) AS n FROM v_riwayat_stok ${clause}`, ...params).n
  const size = Math.min(Math.max(Number(pageSize) || 8, 1), 100)
  const p = Math.max(Number(page) || 1, 1)
  const rows = all(`SELECT * FROM v_riwayat_stok ${clause}
    ORDER BY transaction_date DESC, transaction_id DESC LIMIT ? OFFSET ?`, ...params, size, (p - 1) * size)
  res.json({ items: rows.map(transactionToFE), total, page: p, pageSize: size })
})

api.get('/transactions/:id', (req, res) => {
  const row = one('SELECT * FROM v_riwayat_stok WHERE transaction_id = ?', req.params.id)
  if (!row) return fail(res, 404, 'Transaksi tidak ditemukan.')
  res.json(transactionToFE(row))
})

function validateCommon(body) {
  const material = one('SELECT * FROM v_stok_bahan WHERE ingredient_id = ?', body?.materialId)
  if (!material) return { error: 'Bahan baku tidak ditemukan.' }
  if (!material.is_aktif) return { error: 'Bahan baku sudah dinonaktifkan.' }
  if (!material.is_stockable) return { error: 'Bahan ini tidak bisa ditransaksikan.' }
  const qty = Number(body.quantity)
  if (!Number.isFinite(qty) || qty <= 0) return { error: 'Jumlah harus berupa angka lebih dari 0.' }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return { error: 'Tanggal transaksi tidak valid.' }
  if (!body.time || !/^\d{2}:\d{2}$/.test(body.time)) return { error: 'Waktu transaksi tidak valid.' }
  if (String(body.unit || '') !== String(material.stock_unit || '')) {
    return { error: `Satuan harus ${material.stock_unit}.` }
  }
  return { material, qty }
}

api.post('/transactions/stock-in', (req, res) => {
  const v = validateCommon(req.body)
  if (v.error) return fail(res, 400, v.error)
  const hasPrevious = one('SELECT 1 AS x FROM transaksi_stok WHERE ingredient_id = ? LIMIT 1', req.body.materialId)
  const id = nextId('TX', 'transaksi_stok', 'transaction_id')
  db.prepare(`INSERT INTO transaksi_stok
    (transaction_id, transaction_date, ingredient_id, transaction_type, quantity, unit,
     reason, data_source, is_synthetic, notes, transaction_time)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, req.body.date, req.body.materialId, 'MASUK', v.qty, req.body.unit,
    hasPrevious ? 'PEMBELIAN' : 'STOK_AWAL', 'APP', 0,
    String(req.body.notes || '').trim() || null, req.body.time,
  )
  res.status(201).json(transactionToFE(one('SELECT * FROM v_riwayat_stok WHERE transaction_id = ?', id)))
})

api.post('/transactions/stock-out', (req, res) => {
  const v = validateCommon(req.body)
  if (v.error) return fail(res, 400, v.error)
  const reason = REASON_TO_DB[req.body.reason]
  if (!reason) return fail(res, 400, 'Alasan stok keluar tidak dikenal.')
  if (Number(v.material.stok_saat_ini) < v.qty) {
    return fail(res, 400, `Stok tidak cukup. Tersedia ${v.material.stok_saat_ini} ${v.material.stock_unit}.`)
  }
  const id = nextId('TX', 'transaksi_stok', 'transaction_id')
  db.prepare(`INSERT INTO transaksi_stok
    (transaction_id, transaction_date, ingredient_id, transaction_type, quantity, unit,
     reason, data_source, is_synthetic, notes, transaction_time)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, req.body.date, req.body.materialId, 'KELUAR', v.qty, req.body.unit,
    reason, 'APP', 0, String(req.body.notes || '').trim() || null, req.body.time,
  )
  res.status(201).json(transactionToFE(one('SELECT * FROM v_riwayat_stok WHERE transaction_id = ?', id)))
})

api.get('/dashboard/summary', (req, res) => {
  const rows = all('SELECT status, COUNT(*) AS n FROM v_stok_bahan WHERE is_aktif = 1 GROUP BY status')
  const counts = Object.fromEntries(rows.map((r) => [r.status, r.n]))
  res.json({
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    Normal: counts.Normal || 0,
    Menipis: counts.Menipis || 0,
    Kritis: counts.Kritis || 0,
    BELUM_DIATUR: counts.BELUM_DIATUR || 0,
  })
})

api.get('/dashboard/attention', (req, res) => {
  const rows = all(`SELECT * FROM v_stok_bahan
    WHERE is_aktif = 1 AND status IN ('Menipis','Kritis')
    ORDER BY CASE status WHEN 'Kritis' THEN 0 ELSE 1 END, ingredient_id LIMIT 8`)
  res.json(rows.map(materialToFE))
})
