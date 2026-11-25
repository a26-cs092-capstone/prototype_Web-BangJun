# Pemetaan Atribut Frontend vs Database — Kedai Bang Jun

Tujuan: backend bisa menyajikan data dalam bentuk yang dipakai frontend tanpa mengubah UI/UX, sementara database tetap memakai skema tim Data Science.

## 1. Perbedaan mendasar

| Aspek | Frontend | Database |
|---|---|---|
| Jumlah bahan | 28 fixture di `src/data/materials.js` | 16 baris di `bahan_baku.csv`, 13 `INDIVIDUAL` + 3 `GROUP` |
| Nama bahan | Contoh `Beras Ramos Premium`, `Daging Ayam Broiler Fillet` | Contoh `Beras`, `Dada ayam`, `Tepung roti` |
| Stok | Disimpan langsung di `currentStock` | Tidak disimpan; dihitung dari transaksi di view `v_stok_bahan` |
| Status | Disimpan sebagai field `status` di fixture | Dihitung di view; bisa `BELUM_DIATUR` |
| Bahan non-stockable | Tidak ada konsepnya | 3 GROUP: `Bumbu-bumbu`, `Saus-saus`, `Sambal-sambal` |
| Satuan | `kg, gram, liter, ml, bungkus, pack, karung, piring, butir` | `kg` (9), `butir` (2), `pcs` (1), `liter` (1), kosong (3) |
| Transaksi awal | `currentStock: null`, transaksi masuk pertama jadi saldo awal | Transaksi `MASUK` dengan `reason = STOK_AWAL` |

## 2. Mapping field bahan baku

| Frontend | Database / view | Catatan |
|---|---|---|
| `id` (`mat-001`) | `ingredient_id` (`B001`) | Perlu translasi ID. Bisa juga frontend pakai `B001` langsung. |
| `name` | `ingredient_name` | Nama di frontend bukan nama di dataset. Perlu keputusan: pakai nama DS atau nama Figma. |
| `currentStock` | `stok_saat_ini` | View, bukan kolom. Jangan ditulis backend. |
| `minimumStock` | `stok_minimum` | Sama secara makna, beda nama. |
| `unit` | `stock_unit` | Sama secara makna, beda nama. |
| `status` | `status` | Hitungan database. Frontend perlu menerima `BELUM_DIATUR`. |
| `active` | `is_aktif` | Sama makna (`true` = aktif). |
| `updatedAt` | `updated_at` | Format ISO vs TIMESTAMPTZ. |
| (tidak ada) | `category`, `item_type`, `source_type`, `purchase_unit_interview`, `is_stockable`, `unit_basis`, `verification_status`, `data_source`, `is_synthetic`, `notes` | Boleh disembunyikan dari response, tapi harus diisi saat create/update. |

## 3. Mapping field transaksi

| Frontend | Database / view | Catatan |
|---|---|---|
| `id` (`stock-in-...`) | `transaction_id` (`TX000001`) | Perlu translasi ID. |
| `materialId` | `ingredient_id` | Lihat mapping ID bahan. |
| `materialName` | `ingredient_name` (dari join) | Frontend menyimpan duplikat nama; backend cukup join. |
| `type: 'Stok Masuk'` | `transaction_type: 'MASUK'` | Transformasi nilai. |
| `type: 'Stok Keluar'` | `transaction_type: 'KELUAR'` | Transformasi nilai. |
| `date` | `transaction_date` | Format `YYYY-MM-DD` sudah cocok. |
| `time` | `transaction_time` | Format `HH:mm` sudah cocok. |
| `quantity` | `quantity` | Database `NUMERIC(12,4)`, frontend `Number`. |
| `unit` | `unit` | Wajib sama dengan `stock_unit` bahan (trigger database). |
| `reason` (teks bebas) | `reason` (enum 4 nilai) | Lihat bagian 4. |
| `notes` | `notes` | Sama. |
| (tidak ada) | `data_source`, `is_synthetic`, `assumption_id`, `created_at` | Default `APP`, `false`. |
| (tidak ada) | `stok_sebelum`, `stok_sesudah` | Dari `v_riwayat_stok`, dipakai halaman Detail Transaksi. |

## 4. Nilai yang tidak cocok

### Jenis transaksi
- Frontend: `'Stok Masuk'`, `'Stok Keluar'`
- Database: `'MASUK'`, `'KELUAR'`

### Alasan stok keluar
Frontend (5 opsi, teks bebas): `Penggunaan operasional`, `Bahan rusak`, `Bahan kadaluwarsa`, `Bahan terbuang`, `Lainnya`.
Database (CHECK constraint, 4 nilai): `STOK_AWAL`, `PEMBELIAN`, `PENGGUNAAN`, `RUSAK_TERBUANG`.

Usulan pemetaan sementara:

| Frontend | Database |
|---|---|
| Penggunaan operasional | `PENGGUNAAN` |
| Bahan rusak | `RUSAK_TERBUANG` |
| Bahan kadaluwarsa | `RUSAK_TERBUANG` |
| Bahan terbuang | `RUSAK_TERBUANG` |
| Lainnya | `RUSAK_TERBUANG` + `notes` |

Catatan: `Bahan kadaluwarsa` dan `Lainnya` kehilangan makna jika dipetakan ke `RUSAK_TERBUANG`. Perlu keputusan: tambah nilai enum di database, atauawa frontend menyediakan dropdown 2 opsi sesuai database.

### Alasan stok masuk
Frontend tidak punya field alasan. Database mewajibkan `reason`.
- Transaksi pertama untuk bahan (`currentStock === null`) → `STOK_AWAL`
- Transaksi berikutnya → `PEMBELIAN`

### Status stok
- Frontend: `Normal`, `Menipis`, `Kritis` (tersimpan di fixture)
- Database: `BELUM_DIATUR`, `Kritis` (<= 50% minimum), `Menipis` (<= minimum), `Normal`
- Aturan Data Science berbeda lagi: `AMAN`, `MENIPIS`, `SEGERA_BELI` berdasarkan rata-rata pemakaian 7 hari.

Perlu disepakati satu aturan sebelum backend dibuat.

### Satuan
`liter` di frontend vs `Ltr` di mockup Figma vs `liter` di dataset. Perlu satu daftar satuan baku.

## 5. Rekomendasi kontrak API

Backend sebaiknya menerima dan mengembalikan nama field frontend agar komponen tidak diubah. translasi dilakukan di layer backend.

```
GET  /api/v1/materials
     -> [{ id, name, currentStock, minimumStock, unit, status, active, updatedAt }]

GET  /api/v1/materials/:id
     -> field bahan + riwayat transaksi bahan tersebut

POST /api/v1/materials
     body: { name, unit, minimumStock }
     -> simpan ke bahan_baku; category/item_type/is_stockable pakai default

PATCH /api/v1/materials/:id
     body: { name, unit, minimumStock, active }

POST /api/v1/transactions/stock-in
     body: { materialId, quantity, date, time, notes }

POST /api/v1/transactions/stock-out
     body: { materialId, quantity, reason, date, time, notes }

GET  /api/v1/transactions?search=&type=&from=&to=&page=
     -> { items: [{ id, materialId, materialName, type, quantity, unit,
                    reason, date, time, notes, stockBefore, stockAfter }],
          total, page }

GET  /api/v1/dashboard/summary
GET  /api/v1/dashboard/attention
```

Backend bertugas:
1. Terjemahkan `id` <-> `ingredient_id` dan `transaction_id`.
2. Terjemahkan `type` dan `reason`.
3. Ambil `currentStock` dan `status` dari `v_stok_bahan`, jangan hitung ulang di frontend.
4. Ambil `stockBefore`/`stockAfter` dari `v_riwayat_stok`.
5. Menolak transaksi yang melanggar aturan database (stok kurang, satuan beda, bahan nonaktif/non-stockable) dan menerjemahkan pesan error database ke pesan bahasa Indonesia yang dipakai frontend.

## 6. Keputusan yang masih dibutuhkan tim

1. Nama bahan: pakai 16 nama dari dataset DS atau 28 nama dari frontend/Figma?
2. Daftar satuan baku.
3. Aturan status: database, Data Science, atau aturan baru.
4. Alasan stok keluar: 2 opsi sesuai database atau tambah enum baru.
5. Apakah bahan `GROUP` (`Bumbu-bumbu`, `Saus-saus`, `Sambal-sambal`) ditampilkan di UI sebagai non-transactional.
6. Apakah data sintetis DS dipakai sebagai data awal demo atau dihapus sebelum go-live.
