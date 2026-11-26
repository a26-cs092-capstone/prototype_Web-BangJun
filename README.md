# Prototype Web Kedai Bang Jun

Prototype frontend dan backend untuk Digitalisasi Pengelolaan Stok Bahan Baku Kedai Bang Jun (capstone Asah A26-CS092).

Data awal bersifat sintetis dari tim Data Science, bukan data operasional kedai.

## Teknologi

| Lapisan | Framework / library | Versi |
|---|---|---|
| Frontend | React | 19 |
| Build tool | Vite | 8 |
| Styling | Tailwind CSS | 4 |
| Routing | React Router | 8 |
| Ikon | Lucide React | tidak tercantum di package.json |
| Grafik | Recharts | 3 (terpasang, belum dipakai) |
| Backend | Express | 5 |
| Database | Supabase PostgreSQL (PostgREST) | tidak ada nomor versi tetap |
| Bahasa | JavaScript (ESM), Node.js 20+ | tidak ada nomor versi tetap |

Struktur: `web/` berisi frontend dan `server/` berisi backend. Backend memakai Supabase REST untuk data produksi, bukan SQLite.

## Isi

- `web/`: frontend React 19, Vite 8, Tailwind 4 dari repo `web-kedai-bang-jun`.
- `server/`: backend Express 5 dan `node:sqlite` bawaan Node.js 22.
- `server/store.js`: lapisan akses data ke Supabase REST (PostgREST).
- `server/schema.sql`: referensi schema SQLite lama. Schema produksi ada di repo database.
- `server/prepare-supabase.js`: sekali jalan untuk mengisi `stok_minimum` demo.
- `.env`: berisi `SUPABASE_URL` dan `SUPABASE_SERVICE_KEY`. File ini rahasia dan tidak di-commit.

## Menjalankan

Butuh Node.js 20+ dan koneksi ke project Supabase `db-stok-bahan-baku-kedai-bang-jun`. Salin kredensial ke `.env`:

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

Hal yang belum disepakati tim dipilih sebagai berikut agar prototype bisa berjalan:

1. Data awal: 16 bahan dan 1.417 transaksi sintetik dari tim Data Science dipakai sebagai demo.
2. Nama bahan: memakai nama dari dataset (`Beras`, `Dada ayam`), bukan 28 nama fixture frontend.
3. Bahan GROUP (`Bumbu-bumbu`, `Saus-saus`, `Sambal-sambal`) tetap ditampilkan di daftar bahan, tetapi tidak bisa ditransaksikan karena `is_stockable = false`.
4. `stok_minimum`: dataset tidak punya nilai, jadi prototype memakai ambang demo di `server/db.js` (`DEMO_MINIMUM`). Ke-16 bahan dihitung, termasuk 3 kelompok GROUP.
5. Aturan status: memakai aturan view database (`BELUM_DIATUR`, `Kritis` jika stok tidak lebih dari 50% minimum, `Menipis` jika tidak lebih dari minimum, `Normal` untuk sisanya).
6. Alasan stok masuk: transaksi pertama untuk suatu bahan menjadi `STOK_AWAL`, berikutnya `PEMBELIAN`.
7. Alasan stok keluar: dropdown frontend dengan 5 opsi dipetakan ke enum database (`PENGGUNAAN` atau `RUSAK_TERBUANG`).

Rincian pemetaan atribut ada di `docs/attribute-mapping.md`.

## API

Base URL: `/api/v1`

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/materials` | daftar bahan, stok, dan status |
| GET | `/materials/:id` | detail bahan dan 20 transaksi terakhir |
| POST | `/materials` | tambah bahan `{name, unit, minimumStock}` |
| PATCH | `/materials/:id` | ubah bahan `{name, unit, minimumStock, active}` |
| GET | `/transactions?search=&type=&from=&to=&page=&pageSize=` | riwayat terpagasi |
| GET | `/transactions/:id` | detail transaksi |
| POST | `/transactions/stock-in` | `{materialId, quantity, unit, date, time, notes}` |
| POST | `/transactions/stock-out` | `{materialId, quantity, unit, reason, date, time, notes}` |
| GET | `/dashboard/summary` | ringkasan jumlah per status |
| GET | `/dashboard/attention` | bahan Menipis dan Kritis |

Semua request dan response memakai nama field frontend. Backend yang menerjemahkan ke nama kolom database.

Validasi backend: bahan harus aktif dan `is_stockable`, satuan transaksi harus sama dengan satuan bahan, jumlah lebih dari nol, stok keluar tidak boleh melebihi saldo, dan pasangan jenis serta alasan harus valid.

## Akses dari luar

Aplikasi berjalan di `0.0.0.0:3000`. Untuk dibuka teman di luar jaringan, ada dua pilihan:

1. Port forwarding router. Buka port 3000 di router dan arahkan ke IP lokal PC ini. Perlu akses ke router dan IP public.
2. Tunnel. Jalankan Cloudflare Quick Tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Perintah ini menghasilkan URL `https://<nama-acak>.trycloudflare.com` yang bisa dibagikan. URL berubah setiap kali tunnel dijalankan ulang.

Prototype ini tidak punya autentikasi. Bagikan URL hanya kepada orang yang diberi izin dan matikan tunnel setelah selesai.

## Catatan

- Dashboard masih menampilkan placeholder untuk dua panel grafik. Recharts belum dipakai.
- Halaman AI Stock Assistant masih placeholder.
- Data sintetik harus diganti sebelum dipakai operasional.
- Backend memakai Supabase REST dengan service key, sehingga tabel bisa dibaca dan ditulis meskipun RLS aktif untuk publishable key.
- Data awal di Supabase: 16 bahan dan 1.417 transaksi sintetik.
- `stok_minimum` diisi nilai demo oleh `server/prepare-supabase.js`. 3 bahan GROUP tetap tampil tetapi tidak bisa ditransaksikan.
