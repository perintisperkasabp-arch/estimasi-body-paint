# Estimasi Body & Paint – Perintis

Aplikasi web untuk Service Advisor: estimasi jasa body repair (pricelist BP Perintis 2024), spare part, kirim WhatsApp, dan cetak / simpan PDF. Bisa dipasang di layar utama HP dan tetap bisa dibuka tanpa internet.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Aplikasi (pricelist sudah ada di dalamnya) |
| `manifest.webmanifest` | Nama & ikon saat dipasang di HP |
| `sw.js` | Agar aplikasi bisa dibuka offline |
| `icons/` | Ikon aplikasi |
| `vercel.json` | Pengaturan cache untuk Vercel |
| `apps-script/Kode.gs` | Kode untuk penyimpanan Google Spreadsheet (ditempel di Apps Script, bukan diupload ke Vercel) |

## Online-kan (GitHub + Vercel)

1. GitHub → **New repository** → nama `estimasi-bp-perintis` → **Create repository**.
2. **uploading an existing file** → seret semua isi folder ini (termasuk folder `icons`) → **Commit changes**.
3. vercel.com → **Continue with GitHub** → **Add New… → Project** → **Import** repo tadi.
4. Framework Preset: **Other**, Build Command & Output Directory dibiarkan kosong → **Deploy**.
5. Buka alamat `https://estimasi-bp-perintis.vercel.app` (atau yang diberikan Vercel) di Chrome HP → menu ⋮ → **Tambahkan ke layar utama / Instal aplikasi**.

## Penyimpanan Google Spreadsheet

1. Buat Google Spreadsheet baru, misalnya **Estimasi BP Perintis**.
2. Menu **Ekstensi → Apps Script**. Hapus isi `Kode.gs`, tempel isi `apps-script/Kode.gs`.
3. Ganti `GANTI-DENGAN-KUNCI-RAHASIA` dengan kunci Anda (min. 8 karakter) → **Simpan**.
4. Pilih fungsi **setup** → **Jalankan** → izinkan akses. Tab *Estimasi, Detail Jasa, Detail Part, Jasa Tambahan* akan dibuat.
5. **Terapkan → Deployment baru** → ikon roda → **Aplikasi web**. Jalankan sebagai: **Saya**. Yang memiliki akses: **Siapa saja** → **Terapkan**.
6. Salin **URL aplikasi web** (berakhiran `/exec`).
7. Di aplikasi: **Pengaturan → Google Spreadsheet** → tempel URL, isi kunci yang sama dan Kode SA → **Tes koneksi**.

Bila kode Apps Script diubah: **Terapkan → Kelola deployment → Edit (pensil) → Versi: Versi baru → Terapkan** (URL tetap sama).

## Update aplikasi

Ganti `index.html` dan `sw.js` di GitHub (Add file → Upload files → Commit). Vercel otomatis deploy ulang dalam ±1 menit. Di HP, tutup lalu buka lagi aplikasinya.

## Catatan

- Tanpa Spreadsheet, data tersimpan di masing-masing HP. Dengan Spreadsheet, estimasi dan jasa tambahan tersimpan bersama; tekan **Riwayat → Muat dari Spreadsheet** untuk melihat estimasi SA lain.
- Siapa pun yang tahu alamatnya bisa membuka aplikasi (termasuk melihat pricelist). Bagikan alamat hanya ke tim.
