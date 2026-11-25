-- Prototype SQLite schema. Mirrors schema_v2.sql from db-kedai-bang-jun-stok.
CREATE TABLE IF NOT EXISTS bahan_baku (
  ingredient_id VARCHAR(10) PRIMARY KEY,
  ingredient_name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50),
  item_type VARCHAR(12) NOT NULL DEFAULT 'INDIVIDUAL',
  source_type VARCHAR(30),
  purchase_unit_interview VARCHAR(30),
  stock_unit VARCHAR(20),
  is_stockable INTEGER NOT NULL DEFAULT 1,
  unit_basis VARCHAR(30),
  verification_status TEXT,
  data_source VARCHAR(30) DEFAULT 'APP',
  is_synthetic INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  stok_minimum NUMERIC(12,4),
  is_aktif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS transaksi_stok (
  transaction_id VARCHAR(20) PRIMARY KEY,
  transaction_date TEXT NOT NULL,
  ingredient_id VARCHAR(10) NOT NULL REFERENCES bahan_baku(ingredient_id),
  transaction_type VARCHAR(6) NOT NULL CHECK (transaction_type IN ('MASUK','KELUAR')),
  quantity NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) NOT NULL,
  reason VARCHAR(20) NOT NULL CHECK (reason IN ('STOK_AWAL','PEMBELIAN','PENGGUNAAN','RUSAK_TERBUANG')),
  data_source VARCHAR(20) NOT NULL DEFAULT 'APP',
  is_synthetic INTEGER NOT NULL DEFAULT 0,
  assumption_id VARCHAR(30),
  notes TEXT,
  transaction_time TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((transaction_type = 'MASUK' AND reason IN ('STOK_AWAL','PEMBELIAN'))
      OR (transaction_type = 'KELUAR' AND reason IN ('PENGGUNAAN','RUSAK_TERBUANG')))
);

CREATE INDEX IF NOT EXISTS idx_trx_bahan_tanggal ON transaksi_stok (ingredient_id, transaction_date, transaction_id);
CREATE INDEX IF NOT EXISTS idx_trx_tanggal ON transaksi_stok (transaction_date DESC);

CREATE VIEW IF NOT EXISTS v_stok_bahan AS
SELECT
  b.*,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'MASUK' THEN t.quantity ELSE -t.quantity END), 0) AS stok_saat_ini,
  CASE
    WHEN b.stok_minimum IS NULL THEN 'BELUM_DIATUR'
    WHEN COALESCE(SUM(CASE WHEN t.transaction_type = 'MASUK' THEN t.quantity ELSE -t.quantity END), 0) <= b.stok_minimum * 0.5 THEN 'Kritis'
    WHEN COALESCE(SUM(CASE WHEN t.transaction_type = 'MASUK' THEN t.quantity ELSE -t.quantity END), 0) <= b.stok_minimum THEN 'Menipis'
    ELSE 'Normal'
  END AS status
FROM bahan_baku b
LEFT JOIN transaksi_stok t ON t.ingredient_id = b.ingredient_id
GROUP BY b.ingredient_id;

CREATE VIEW IF NOT EXISTS v_riwayat_stok AS
SELECT x.*,
  x.stok_sesudah - CASE WHEN x.transaction_type = 'MASUK' THEN x.quantity ELSE -x.quantity END AS stok_sebelum
FROM (
  SELECT t.*, b.ingredient_name,
    SUM(CASE WHEN t.transaction_type = 'MASUK' THEN t.quantity ELSE -t.quantity END)
      OVER (PARTITION BY t.ingredient_id ORDER BY t.transaction_date, t.transaction_id) AS stok_sesudah
  FROM transaksi_stok t
  JOIN bahan_baku b ON b.ingredient_id = t.ingredient_id
) x;
