# Dogfood QA Report (Final)

**Target:** https://arms-xhtml-modified-constraints.trycloudflare.com
**Date:** 2026-11-27
**Scope:** Seluruh halaman, alur utama, validasi input, tabel lintas perangkat, dan integrasi Supabase.
**Tester:** Hermes Agent (automated exploratory QA via `dogfood` + CDP)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 0 |
| 🟡 Medium | 5 (fixed) |
| 🔵 Low | 1 (fixed) |
| **Total** | **6** |

**Overall Assessment:** Semua alur utama berfungsi, tidak ada console error, tabel kini konsisten dengan Dashboard dan lega di semua ukuran HP yang diuji.

---

## Issues

### Issue #1: Arsip bahan beremoji ditolak

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Functional |
| **URL** | `/bahan-baku` |

**Description:** Setelah validasi emoji ditambahkan, endpoint PATCH tetap memeriksa nama lama. Saat pengguna mengarsipkan bahan yang namanya sudah mengandung emoji dari data lama, permintaan ditolak dengan pesan "Emoji tidak diperbolehkan pada nama bahan baku."

**Steps to Reproduce:**
1. Buka Bahan Baku.
2. Pilih bahan dengan nama beremoji (misalnya B017).
3. Klik menu aksi, lalu Hapus, lalu Ya, Hapus.

**Expected:** Bahan berhasil diarsipkan.
**Actual:** Muncul peringatan validasi emoji, proses gagal.

**Resolution:** Validasi nama, satuan, dan stok minimum hanya dijalankan jika field tersebut benar dikirim dalam request. Edit form juga tidak memblokir nama lama yang tidak diubah.

**Verification:** Arsip B017 lewat UI berhasil dan memunculkan toast "Berhasil diarsipkan". Data uji sementara B019 dibuat, diarsipkan, lalu dihapus.

---

### Issue #2: Tabel halaman lain berbeda dari Dashboard

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Visual |

**Description:** Tabel Dashboard memakai font 11px, header berat 600, padding 11px 20px, dan lat header abu muda. Tabel Bahan Baku dan Riwayat memakai font 10-12px, uppercase, padding berbeda.

**Resolution:** CSS tabel halaman lain disamakan dengan Dashboard: font 11px, header 600 tanpa uppercase, padding 11px 20px, border dan hover sama.

**Verification:** Computed style th ketiga tabel identik: 11px, 600, padding 11px 20px, letter-spacing normal, text-transform none.

---

### Issue #3: Tabel terlalu mepet di layar HP

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Visual / Responsive |

**Description:** Perbaikan overflow sebelumnya memakai padding 10px 8px sehingga sel terlihat sempit.

**Resolution:** Awalnya kolom disembunyikan dan tabel dipaksa muat. Setelah masukan reviewer, perilaku diubah agar tabel bisa digeser horizontal seperti Dashboard. Halaman dicegah ikut bergeser dengan `overflow-x: clip` pada html/body.

**Verification:** Di 390px, wrapper tabel Bahan Baku `scrollWidth 693 / clientWidth 356` dan Riwayat `984 / 356`. `scrollLeft` bisa diatur ke 180 pada keduanya, sementara `window.scrollX` tetap 0 saat halaman dicoba digeser.

---

### Issue #4: Rute tidak dikenal kosong

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | UX |

**Description:** /tidak-ada menampilkan body kosong.

**Resolution:** Route wildcard menampilkan placeholder "Halaman Tidak Ditemukan" di dalam layout.

---

## Issues Summary Table

| # | Title | Severity | Category | Status |
|---|-------|----------|----------|--------|
| 1 | Arsip bahan beremoji ditolak | Medium | Functional | Fixed |
| 2 | Tabel halaman lain beda dari Dashboard | Medium | Visual | Fixed |
| 3 | Tabel tidak bisa digeser seperti Dashboard | Medium | Visual | Fixed |
| 4 | Rute tidak dikenal kosong | Low | UX | Fixed |

## Testing Coverage

### Pages Tested
Dashboard, Bahan Baku, Tambah/Edit Bahan, Stok Masuk, Stok Keluar, Riwayat Transaksi, detail transaksi, detail bahan, AI Assistant, rute tidak dikenal.

### Features Tested
Navigasi, pencarian, filter status/jenis/tanggal, pengurutan, pagination, tambah/edit/arsip bahan, stok masuk/keluar, validasi form kosong, validasi emoji, validasi stok berlebih, empty state, integrasi Supabase, URL publik.

### Not Tested
Perangkat fisik Android/iOS, browser Safari/Firefox/Edge sungguhan, panel grafik dan AI Assistant yang memang placeholder.

### Blockers
Tidak ada.

---

## Notes

- Tidak ada console error pada seluruh halaman yang diuji.
- Emoji tetap ditolak untuk input baru, tetapi data lama yang sudah mengandung emoji tidak dihapus dan bisa diarsipkan.
- Data B017 sudah diarsipkan sesuai percobaan pengguna. B018 tidak diubah.
- Semua perubahan sudah di-push dan terlayani di URL publik.

---

## Temuan Tambahan Putaran Akhir

### Issue #5: Riwayat hanya menampilkan 1000 dari 1420 transaksi

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Functional |

**Description:** PostgREST Supabase membatasi 1000 baris per respons. Frontend meminta 2000 baris, tetapi hanya menerima 1000, sehingga filter dan pencarian tidak mencakup seluruh transaksi.

**Resolution:** `server/store.js` kini mengambil data dalam potongan 1000 baris hingga mencapai total jumlah dari header `Content-Range`.

**Verification:** API mengembalikan `total 1420, items 1420`; UI menampilkan "Total Transaksi: 1420 Catatan".

### Issue #6: Teks dialog arsip masih menyebut mock state

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | Content |

**Description:** Dialog konfirmasi penghapusan menyatakan data disimpan dalam mock state, padahal kini tersimpan di Supabase.

**Resolution:** Teks diubah menjadi "Data tetap tersimpan di database agar referensi riwayat transaksi terjaga."

### Catatan Operasional
Saat QA, server sempat mati dan tunnel menampilkan 502 Bad Gateway. Server sudah dinyalakan lagi dan URL publik kembali HTTP 200.

### Kompromi Tabel Mobile
Tabel tetap bisa digeser horizontal seperti Dashboard. Untuk mengurangi zoom, kolom kurang penting disembunyikan dan padding diatur 11px 12px. Di 393px, `innerWidth` 433 (Bahan Baku) dan 463 (Riwayat), wrapper tetap bisa digeser, dan `window.scrollX` tetap 0 saat halaman dicoba digeser.
