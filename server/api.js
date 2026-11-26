import { Router } from 'express'
import * as store from './store.js'
import { materialToFE, transactionToFE, TYPE_TO_DB, REASON_TO_DB } from './mapping.js'

export const api = Router()
const fail = (res, status, message) => res.status(status).json({ error: message })
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u
const hasEmoji = (value) => EMOJI.test(String(value ?? ''))

api.get('/materials', wrap(async (req, res) => {
  const rows = await store.listMaterials()
  res.json(rows.map(materialToFE))
}))

api.get('/materials/:id', wrap(async (req, res) => {
  const row = await store.getMaterial(req.params.id)
  if (!row) return fail(res, 404, 'Bahan baku tidak ditemukan.')
  const history = await store.getHistory(req.params.id)
  res.json({ ...materialToFE(row), history: history.map(transactionToFE) })
}))

api.post('/materials', wrap(async (req, res) => {
  const { name, unit, minimumStock } = req.body || {}
  if (!name || !String(name).trim()) return fail(res, 400, 'Nama bahan baku wajib diisi.')
  else if (hasEmoji(name)) return fail(res, 400, 'Emoji tidak diperbolehkan pada nama bahan baku.')
  if (!unit || !String(unit).trim()) return fail(res, 400, 'Satuan wajib dipilih.')
  const min = Number(minimumStock)
  if (!Number.isFinite(min) || min < 0) return fail(res, 400, 'Stok minimum harus angka nonnegatif.')
  const id = await store.nextMaterialId()
  try {
    await store.createMaterial({
      ingredient_id: id,
      ingredient_name: String(name).trim(),
      category: null,
      item_type: 'INDIVIDUAL',
      stock_unit: String(unit).trim(),
      is_stockable: true,
      data_source: 'APP',
      is_synthetic: false,
      stok_minimum: min,
      is_aktif: true,
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    return fail(res, 400, 'Nama bahan baku sudah digunakan atau data ditolak database.')
  }
  res.status(201).json(materialToFE({ ingredient_id: id, ingredient_name: String(name).trim(), stock_unit: String(unit).trim(), stok_minimum: min, stok_saat_ini: 0, status: 'BELUM_DIATUR', is_aktif: true, is_stockable: true, updated_at: new Date().toISOString() }))
}))

api.patch('/materials/:id', wrap(async (req, res) => {
  const row = await store.getMaterial(req.params.id)
  if (!row) return fail(res, 404, 'Bahan baku tidak ditemukan.')
  const name = req.body?.name ?? row.ingredient_name
  const unit = req.body?.unit ?? row.stock_unit
  const minimumStock = req.body?.minimumStock ?? row.stok_minimum
  const active = req.body?.active === undefined ? row.is_aktif : Boolean(req.body.active)
  if (!name || !String(name).trim()) return fail(res, 400, 'Nama bahan baku wajib diisi.')
  else if (hasEmoji(name)) return fail(res, 400, 'Emoji tidak diperbolehkan pada nama bahan baku.')
  if (!unit || !String(unit).trim()) return fail(res, 400, 'Satuan wajib dipilih.')
  const min = Number(minimumStock)
  if (!Number.isFinite(min) || min < 0) return fail(res, 400, 'Stok minimum tidak valid.')
  await store.updateMaterial(req.params.id, {
    ingredient_name: String(name).trim(),
    stock_unit: String(unit).trim(),
    stok_minimum: min,
    is_aktif: active,
    updated_at: new Date().toISOString(),
  })
  const fresh = await store.getMaterial(req.params.id)
  res.json(materialToFE(fresh))
}))

api.get('/transactions', wrap(async (req, res) => {
  const { search = '', type = '', from = '', to = '', page = '1', pageSize = '8' } = req.query
  const size = Math.min(Math.max(Number(pageSize) || 8, 1), 100)
  const p = Math.max(Number(page) || 1, 1)
  const dbType = type ? (TYPE_TO_DB[type] || type) : ''
  const { items, total } = await store.listTransactions({ search, type: dbType, from, to, page: p, pageSize: size })
  res.json({ items: items.map(transactionToFE), total, page: p, pageSize: size })
}))

api.get('/transactions/:id', wrap(async (req, res) => {
  const row = await store.getTransaction(req.params.id)
  if (!row) return fail(res, 404, 'Transaksi tidak ditemukan.')
  res.json(transactionToFE(row))
}))

async function validateCommon(body) {
  const material = await store.getMaterial(body?.materialId)
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

api.post('/transactions/stock-in', wrap(async (req, res) => {
  const v = await validateCommon(req.body)
  if (v.error) return fail(res, 400, v.error)
  if (hasEmoji(req.body.notes)) return fail(res, 400, 'Keterangan tidak boleh mengandung emoji.')
  const hasPrevious = await store.hasTransaction(req.body.materialId)
  const id = await store.nextTransactionId()
  await store.createTransaction({
    transaction_id: id,
    transaction_date: req.body.date,
    ingredient_id: req.body.materialId,
    transaction_type: 'MASUK',
    quantity: v.qty,
    unit: req.body.unit,
    reason: hasPrevious ? 'PEMBELIAN' : 'STOK_AWAL',
    data_source: 'APP',
    is_synthetic: false,
    notes: String(req.body.notes || '').trim() || null,
    transaction_time: req.body.time,
  })
  const fresh = await store.getTransaction(id)
  res.status(201).json(transactionToFE(fresh))
}))

api.post('/transactions/stock-out', wrap(async (req, res) => {
  const v = await validateCommon(req.body)
  if (v.error) return fail(res, 400, v.error)
  if (hasEmoji(req.body.notes)) return fail(res, 400, 'Keterangan tidak boleh mengandung emoji.')
  const reason = REASON_TO_DB[req.body.reason]
  if (!reason) return fail(res, 400, 'Alasan stok keluar tidak dikenal.')
  const available = Number(v.material.stok_saat_ini) || 0
  if (available < v.qty) {
    return fail(res, 400, `Stok tidak cukup. Tersedia ${available} ${v.material.stock_unit}.`)
  }
  const id = await store.nextTransactionId()
  await store.createTransaction({
    transaction_id: id,
    transaction_date: req.body.date,
    ingredient_id: req.body.materialId,
    transaction_type: 'KELUAR',
    quantity: v.qty,
    unit: req.body.unit,
    reason,
    data_source: 'APP',
    is_synthetic: false,
    notes: String(req.body.notes || '').trim() || null,
    transaction_time: req.body.time,
  })
  const fresh = await store.getTransaction(id)
  res.status(201).json(transactionToFE(fresh))
}))

api.get('/dashboard/summary', wrap(async (req, res) => {
  res.json(await store.dashboardSummary())
}))

api.get('/dashboard/attention', wrap(async (req, res) => {
  res.json((await store.dashboardAttention()).map(materialToFE))
}))
