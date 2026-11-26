# Dogfood QA Report

**Target:** https://arms-xhtml-modified-constraints.trycloudflare.com
**Date:** 2026-11-26
**Scope:** Seluruh halaman prototype (Dashboard, Bahan Baku, Stok Masuk, Stok Keluar, Riwayat Transaksi, Detail, AI Assistant), uji fungsional, validasi form, emulasi perangkat, dan rute tidak dikenal.
**Tester:** Hermes Agent (automated exploratory QA via `dogfood` + CDP)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 0 |
| 🟡 Medium | 1 (fixed) |
| 🔵 Low | 1 (fixed) |
| **Total** | **2** |

**Overall Assessment:** Aplikasi stabil, tanpa console error, dan semua alur utama berfungsi. Dua temuan QA berupa viewport mobile yang melebar dan halaman 404 kosong sudah diperbaiki serta terverifikasi ulang.

---

## Issues

### Issue #1: Viewport mobile melebar pada halaman bertabel

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Visual / Responsive |
| **URL** | `/bahan-baku`, `/riwayat-transaksi` |

**Description:** Pada emulasi Android 390px dan iOS 393px, lebar layout viewport membengkak menjadi 693px (Bahan Baku) dan 930px (Riwayat Transaksi) karena tabel lebar tetap memengaruhi lebar dokumen meski berada di dalam wrapper `overflow-x:auto`.

**Steps to Reproduce:**
1. Buka URL publik di perangkat 390px atau emulasi CDP `mobile:true`.
2. Navigasi ke Bahan Baku atau Riwayat Transaksi.
3. Periksa `window.innerWidth` dan `document.documentElement.scrollWidth`.

**Expected Behavior:** Keduanya 390px, tidak ada zoom-out otomatis.

**Actual Behavior:** `innerWidth` dan `scrollWidth` menjadi 693px / 930px, membuat teks tampak lebih kecil.

**Resolution:** Ditambahkan aturan mobile `table-layout:fixed`, `white-space:normal`, `width:100%`, padding sel diperkecil, dan `overflow-wrap:anywhere`. Verifikasi ulang kelima ukuran layar menunjukkan overflow 0.

**Screenshot:**
MEDIA:E:/Hermes/kedai-bangjun/prototype/qa-output/screenshots/qa-evidence.png

**Console Errors:** tidak ada.

---

### Issue #2: Rute tidak dikenal menampilkan halaman kosong

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | UX / Navigation |

**Description:** Mengunjungi URL di luar rute yang didefinisikan menghasilkan body kosong; hanya `#root` berisi toast viewport.

**Steps to Reproduce:**
1. Buka `/tidak-ada`.
2. Amati area konten.

**Expected Behavior:** Muncul pesan halaman tidak ditemukan dengan navigasi kembali.

**Actual Behavior:** Halaman kosong, tanpa pesan.

**Resolution:** Ditambahkan route wildcard `*` yang merender placeholder "Halaman Tidak Ditemukan" di dalam layout utama.

**Console Errors:** tidak ada.

---

## Issues Summary Table

| # | Title | Severity | Category | Status | URL |
|---|-------|----------|----------|--------|-----|
| 1 | Viewport mobile melebar pada tabel | 🟡 Medium | Visual | Fixed | `/bahan-baku`, `/riwayat-transaksi` |
| 2 | Rute tidak dikenal kosong | 🔵 Low | UX | Fixed | `/tidak-ada` |

## Testing Coverage

### Pages Tested
- `/`, `/bahan-baku`, `/bahan-baku/tambah`, `/bahan-baku/B001`, `/bahan-baku/B001/edit`
- `/stok-masuk`, `/stok-keluar`
- `/riwayat-transaksi`, `/riwayat-transaksi/TX001418`
- `/ai-assistant`, `/tidak-ada`

### Features Tested
- Navigasi sidebar dan breadcrumb, keyboard Tab.
- Pencarian, filter status, filter jenis, filter tanggal, pengurutan, pagination.
- Tambah, edit, dan arsip bahan baku lewat dialog konfirmasi.
- Submit stok masuk dan stok keluar, validasi form kosong, validasi stok berlebih (HTTP 400).
- Empty state riwayat transaksi.
- Responsive: desktop 1920, laptop 1366, tablet 768, Android 390, iOS 393.
- Akses publik lewat tunnel dan konsistensi build dengan localhost.

### Not Tested / Out of Scope
- Perangkat fisik Android/iOS (hanya emulasi CDP).
- Browser Safari/Firefox/Edge sungguhan.
- Panel grafik Dashboard dan AI Assistant (memang placeholder prototype).
- Autentikasi (prototype belum punya login).

### Blockers
- Tidak ada.

---

## Notes

- Tidak ada `console.error`, uncaught exception, atau unhandled rejection pada seluruh halaman yang diuji.
- Semua mutasi data saat QA dijalankan pada server test dan Supabase, lalu data uji dibersihkan.
- Perbaikan sudah di-push sebagai commit `8cceeb0` (Supabase) dan commit QA berikutnya, serta terlayani di URL publik.
- Disarankan reviewer membuka URL publik dari HP asli untuk mengonfirmasi hasil emulasi mobile.
