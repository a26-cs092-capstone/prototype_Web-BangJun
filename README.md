# Prototype Web Kedai Bang Jun

Prototype frontend + backend untuk Digitalisasi Pengelolaan Stok Bahan Baku Kedai Bang Jun (capstone Asah A26-CS092).

Ini **prototype**: data awal bersifat sintetis dari tim Data Science, bukan data operasional kedai.

## Isi

- `web/` — frontend React 19 + Vite 8 + Tailwind 4 (dari repo `web-kedai-bang-jun`).
- `server/` — backend Express 5 + `node:sqlite` (SQLite bawaan Node.js 22+).
- `server/store.js` — lapisan akses data ke Supabase REST (PostgREST).
- `server/schema.sql` — referensi schema SQLite lama; schema produksi ada di repo database.
- `server/prepare-supabase.js` — sekali jalan untuk mengisi `stok_minimum` demo dan menonaktifkan bahan GROUP.
- `.env` — berisi `SUPABASE_URL` dan `SUPABASE_SERVICE_KEY` (rahasia, tidak di-commit).

## Menjalankan

Butuh Node.js 20+ dan koneksi ke project Supabase `db-stok-bahan-baku-kedai-bang-jun`.
Salin kredensial ke `.env`:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=<secret key>
```

Jangan pernah commit `.env`.

```bash
npm install
npm run build          # sekali, membuat web/dist
npm start              # http://localhost:3000
```

Untuk development:

```bash
npm run dev            # backend dengan auto-reload
npm run dev --prefix web   # frontend Vite di port 5173 (proxies tidak diset; pakai build untuk review penuh)
```

## Keputusan prototype

Hal yang belum disepakati tim, dipilih berikut agar prototype bisa berjalan:

1. **Data awal**: 16 bahan dan 1.417 transaksi sintetik dari tim Data Science dipakai sebagai demo.
2. **Nama bahan**: memakai nama dari dataset (`Beras`, `Dada ayam`), bukan 28 nama fixture frontend.
3. **Bahan GROUP** (`Bumbu-bumbu`, `Saus-saus`, `Sambal-sambal`) ditandai nonaktif karena `is_stockable = false`; tidak bisa ditransaksikan.
4. **`stok_minimum`**: dataset tidak punya nilai, jadi prototype memakai ambang demo di `server/db.js` (`DEMO_MINIMUM`). Total hanya 13 bahan aktif yang dihitung.
5. **Aturan status**: memakai aturan view database (`BELUM_DIATUR`, `Kritis` <= 50% minimum, `Menipis` <= minimum, `Normal`).
6. **Alasan stok masuk**: transaksi pertama untuk bahan menjadi `STOK_AWAL`, berikutnya `PEMBELIAN`.
7. **Alasan stok keluar**: dropdown frontend (5 opsi) dipetakan ke enum database (`PENGGUNAAN` / `RUSAK_TERBUANG`).

Rincian pemetaan atribut ada di `docs/attribute-mapping.md`.

## API

Base URL: `/api/v1`

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/materials` | daftar bahan + stok + status |
| GET | `/materials/:id` | detail bahan + 20 transaksi terakhir |
| POST | `/materials` | tambah bahan `{name, unit, minimumStock}` |
| PATCH | `/materials/:id` | ubah bahan `{name, unit, minimumStock, active}` |
| GET | `/transactions?search=&type=&from=&to=&page=&pageSize=` | riwayat terpagasi |
| GET | `/transactions/:id` | detail transaksi |
| POST | `/transactions/stock-in` | `{materialId, quantity, unit, date, time, notes}` |
| POST | `/transactions/stock-out` | `{materialId, quantity, unit, reason, date, time, notes}` |
| GET | `/dashboard/summary` | ringkasan jumlah per status |
| GET | `/dashboard/attention` | bahan Menipis/Kritis |

Semua request/response memakai nama field frontend. Backend yang menerjemahkan ke nama kolom database.

Validasi yang dijalankan backend: bahan aktif dan `is_stockable`, satuan harus sama dengan satuan bahan, jumlah > 0, stok keluar tidak boleh melebihi saldo, dan pasangan jenis/alasan harus valid.

## Akses dari luar

Aplikasi berjalan di `0.0.0.0:3000`. Untuk dibuka teman di luar jaringan, dua pilihan:

1. **Port forwarding router**: buka port 3000 di router dan arahkan ke IP lokal PC ini. Perlu akses ke router dan IP public.
2. **Tunnel (lebih mudah)**: jalankan Cloudflare Quick Tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Perintah ini menghasilkan URL `https://<nama-acak>.trycloudflare.com` yang bisa dibagikan. URL berubah setiap kali tunnel dijalankan ulang.

Karena prototype tidak punya autentikasi, bagikan URL hanya kepada orang yang diberi izin dan matikan tunnel setelah selesai.

## Catatan

- Dashboard masih menampilkan placeholder untuk dua panel grafik ( Recharts belum dipakai).
- AI Stock Assistant masih placeholder.
- Data sintetik harus diganti sebelum dipakai operasional.
- Backend memakai Supabase REST dengan service key, sehingga tabel bisa dibaca dan ditulis meskipun RLS aktif untuk publishable key.
- Data awal sudah ada di Supabase: 16 bahan dan 1.417 transaksi sintetik.
- `stok_minimum` diisi nilai demo oleh `server/prepare-supabase.js`; 3 bahan GROUP dinonaktifkan karena tidak bisa ditransaksikan.
