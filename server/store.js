import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(here, '..', '.env')

function loadEnv() {
  const out = {}
  if (!fs.existsSync(envPath)) return out
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2]
  }
  return out
}

const env = loadEnv()
const BASE = process.env.SUPABASE_URL || env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY
if (!BASE || !KEY) throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_KEY harus ada di .env')

async function request(table, { method = 'GET', params = {}, body, count = false } = {}) {
  const url = new URL(`${BASE}/rest/v1/${table}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  }
  if (count) headers.Prefer = 'count=exact'
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`)
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { data, range: res.headers.get('content-range') }
}

export const supabase = { request }

export async function listMaterials() {
  return (await request('v_stok_bahan', { params: { select: '*', order: 'ingredient_id.asc' } })).data
}

export async function getMaterial(id) {
  const rows = (await request('v_stok_bahan', { params: { select: '*', ingredient_id: `eq.${id}`, limit: 1 } })).data
  return rows?.[0] || null
}

export async function getHistory(id) {
  return (await request('v_riwayat_stok', {
    params: {
      select: '*', ingredient_id: `eq.${id}`,
      order: 'transaction_date.desc,transaction_id.desc', limit: 20,
    },
  })).data
}

export async function nextMaterialId() {
  const rows = (await request('bahan_baku', { params: { select: 'ingredient_id', order: 'ingredient_id.desc', limit: 1 } })).data
  const last = rows?.[0]?.ingredient_id || 'B000'
  return `B${String(Number(String(last).replace(/\D/g, '')) + 1).padStart(3, '0')}`
}

export async function nextTransactionId() {
  const rows = (await request('transaksi_stok', { params: { select: 'transaction_id', order: 'transaction_id.desc', limit: 1 } })).data
  const last = rows?.[0]?.transaction_id || 'TX000000'
  return `TX${String(Number(String(last).replace(/\D/g, '')) + 1).padStart(6, '0')}`
}

export async function createMaterial(row) {
  return (await request('bahan_baku', { method: 'POST', body: row, params: { select: '*' } })).data?.[0]
}

export async function updateMaterial(id, patch) {
  return (await request('bahan_baku', {
    method: 'PATCH', params: { ingredient_id: `eq.${id}`, select: '*' }, body: patch,
  })).data?.[0]
}

export async function listTransactions({ search, type, from, to, page, pageSize }) {
  const params = { select: '*', order: 'transaction_date.desc,transaction_id.desc', limit: pageSize, offset: (page - 1) * pageSize }
  if (type) params.transaction_type = `eq.${type}`
  if (from) params.transaction_date = `gte.${from}`
  if (to) params.transaction_date = `lte.${to}`
  if (search) {
    const term = String(search).replace(/[%,()]/g, ' ')
    params.or = `(ingredient_name.ilike.*${term}*,notes.ilike.*${term}*)`
  }
  const r = await request('v_riwayat_stok', { params, count: true })
  const total = Number(String(r.range || '').split('/')[1]) || 0
  return { items: r.data || [], total }
}

export async function getTransaction(id) {
  const rows = (await request('v_riwayat_stok', { params: { select: '*', transaction_id: `eq.${id}`, limit: 1 } })).data
  return rows?.[0] || null
}

export async function hasTransaction(ingredientId) {
  const r = await request('transaksi_stok', { params: { select: 'transaction_id', ingredient_id: `eq.${ingredientId}`, limit: 1 } })
  return (r.data || []).length > 0
}

export async function createTransaction(row) {
  return (await request('transaksi_stok', { method: 'POST', body: row, params: { select: '*' } })).data?.[0]
}

export async function dashboardSummary() {
  const rows = (await request('v_stok_bahan', { params: { select: 'status,is_aktif' } })).data || []
  const counts = {}
  for (const r of rows) if (r.is_aktif) counts[r.status] = (counts[r.status] || 0) + 1
  return {
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    Normal: counts.Normal || 0,
    Menipis: counts.Menipis || 0,
    Kritis: counts.Kritis || 0,
    BELUM_DIATUR: counts.BELUM_DIATUR || 0,
  }
}

export async function dashboardAttention() {
  return (await request('v_stok_bahan', {
    params: {
      select: '*', is_aktif: 'eq.true',
      status: 'in.(Menipis,Kritis)', order: 'ingredient_id.asc', limit: 8,
    },
  })).data
}
