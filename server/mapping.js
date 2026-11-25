export const TYPE_TO_DB = { 'Stok Masuk': 'MASUK', 'Stok Keluar': 'KELUAR' }
export const TYPE_TO_FE = { MASUK: 'Stok Masuk', KELUAR: 'Stok Keluar' }

export const REASON_TO_DB = {
  'Penggunaan operasional': 'PENGGUNAAN',
  'Bahan rusak': 'RUSAK_TERBUANG',
  'Bahan kadaluwarsa': 'RUSAK_TERBUANG',
  'Bahan terbuang': 'RUSAK_TERBUANG',
  Lainnya: 'RUSAK_TERBUANG',
}

export const REASON_TO_FE = {
  STOK_AWAL: 'Stok awal',
  PEMBELIAN: 'Pembelian',
  PENGGUNAAN: 'Penggunaan operasional',
  RUSAK_TERBUANG: 'Bahan rusak',
}

const num = (v) => (v === null || v === undefined ? null : Number(v))

export function materialToFE(row) {
  return {
    id: row.ingredient_id,
    name: row.ingredient_name,
    currentStock: num(row.stok_saat_ini),
    minimumStock: num(row.stok_minimum),
    unit: row.stock_unit || '',
    status: row.status,
    active: Boolean(row.is_aktif),
    stockable: Boolean(row.is_stockable),
    category: row.category || '',
    updatedAt: row.updated_at,
  }
}

export function transactionToFE(row) {
  return {
    id: row.transaction_id,
    materialId: row.ingredient_id,
    materialName: row.ingredient_name,
    type: TYPE_TO_FE[row.transaction_type] || row.transaction_type,
    quantity: num(row.quantity),
    unit: row.unit,
    reason: REASON_TO_FE[row.reason] || row.reason,
    date: row.transaction_date,
    time: row.transaction_time || '',
    notes: row.notes || '',
    stockBefore: num(row.stok_sebelum),
    stockAfter: num(row.stok_sesudah),
  }
}
