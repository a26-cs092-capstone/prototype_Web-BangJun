import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const dbPath = process.env.KEDAI_DB_PATH || path.join(root, 'data', 'kedai.db')

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON')
db.exec(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'))

export function parseCsv(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (quoted) {
      if (c === '"') {
        if (raw[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  const header = rows.shift()
  return rows.filter((r) => r.length === header.length && r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])))
}

// Prototype thresholds. These are assumptions, not owner-confirmed values.
const DEMO_MINIMUM = {
  B001: 10, B002: 5, B003: 8, B004: 10, B005: 10,
  B009: 2, B010: 2, B011: 2, B012: 2, B013: 50,
  B014: 15, B015: 20, B016: 10,
}

export function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM bahan_baku').get().n
  if (count > 0) return { seeded: false, materials: count, transactions: db.prepare('SELECT COUNT(*) AS n FROM transaksi_stok').get().n }

  const bahan = parseCsv(path.join(here, 'bahan_baku.csv'))
  const trx = parseCsv(path.join(here, 'transaksi_stok.csv'))
  const insBahan = db.prepare(`INSERT INTO bahan_baku
    (ingredient_id, ingredient_name, category, item_type, source_type, purchase_unit_interview,
     stock_unit, is_stockable, unit_basis, verification_status, data_source, is_synthetic, notes,
     stok_minimum, is_aktif)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  const insTrx = db.prepare(`INSERT INTO transaksi_stok
    (transaction_id, transaction_date, ingredient_id, transaction_type, quantity, unit, reason,
     data_source, is_synthetic, assumption_id, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)

  db.exec('BEGIN')
  try {
    for (const r of bahan) {
      const isStockable = r.is_stockable === 'true' ? 1 : 0
      insBahan.run(
        r.ingredient_id, r.ingredient_name, r.category || null, r.item_type || 'INDIVIDUAL',
        r.source_type || null, r.purchase_unit_interview || null, r.stock_unit || null,
        isStockable, r.unit_basis || null, r.verification_status || null,
        r.data_source || 'APP', r.is_synthetic === 'true' ? 1 : 0, r.notes || null,
        DEMO_MINIMUM[r.ingredient_id] ?? null,
        isStockable ? 1 : 0, // GROUP items are non-transactional in this prototype
      )
    }
    for (const r of trx) {
      insTrx.run(
        r.transaction_id, r.transaction_date, r.ingredient_id, r.transaction_type,
        Number(r.quantity), r.unit, r.reason, r.data_source || 'APP',
        r.is_synthetic === 'true' ? 1 : 0, r.assumption_id || null, r.notes || null,
      )
    }
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return { seeded: true, materials: bahan.length, transactions: trx.length }
}

export function nextId(prefix, table, column) {
  const row = db.prepare(`SELECT ${column} AS id FROM ${table} ORDER BY ${column} DESC LIMIT 1`).get()
  if (!row) return prefix + (table === 'bahan_baku' ? '001' : '000001')
  const n = Number(String(row.id).replace(/^[A-Z]+/, '')) + 1
  return table === 'bahan_baku' ? `B${String(n).padStart(3, '0')}` : `TX${String(n).padStart(6, '0')}`
}
