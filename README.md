# PustakaPOS — Admin Panel Toko Buku

Admin panel untuk manage stok buku, transaksi kasir, dan laporan keuangan. Deployed via Cloudflare Pages.

**Live:** https://bunayya-putra.pages.dev

## Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Storage:** Supabase (auth + database), Cloudflare R2 (images)
- **Deploy:** Cloudflare Pages (Git integration — auto-build from GitHub master)

## Key Features

- 📚 Manage buku (CRUD, search, barcode scan, cover upload + crop edit)
- 🏷️ Genre & subgenre management
- 👤 Manajemen akun (admin profile)
- 💰 Transaksi kasir + riwayat pesanan
- 📊 Dashboard dengan rekap data

## ⚠️ Critical: Cover Upload System

Cover upload flow menggunakan **3-layer protection** agar gambar yg disimpan benar-benar yang terbaru:

### 1. Unique R2 Keys (DILARANG FIXED KEY)

File: `src/app/api/upload-cover/route.ts` — function `genKey()`

Setiap upload harus menghasilkan **key UNIK**. Contoh:
- ✅ `978xxx-1744567890-a1b2c3.jpg` (BENAR — timestamp+random suffix)
- ❌ `978xxx.jpg` (SALAH — fixed key menyebabkan browser cache)

**Aturan:** Jangan pernah return `${filename}${ext}` saja. Selalu tambah timestamp + random.

### 2. DELETE Handler Wajib Ada

File: `src/app/api/cover/[...key]/route.ts`

Wajib ekspor `DELETE()` handler untuk menghapus object lama dari R2. Tanpa ini `deleteCoverFromR2()` gagal silent.

### 3. Hapus Lama Setelah Upload Sukses

File: `src/components/CoverUploader.tsx` — di `uploadToR2()`

Panggil `deleteCoverFromR2(currentCover)` **setelah** upload baru berhasil (`data.url` diterima), bukan sebelumnya. Kalau upload gagal, cover lama tetap aman.

### Alur Lengkap

1. User pilih file → `CoverEditor` (crop, rotate, brightness, contrast)
2. Klik "Gunakan Gambar Ini" → `handleSave()` → blob dikirim ke `uploadToR2()`
3. Kompres gambar via Canvas API (max 200KB, JPEG)
4. Upload ke R2 dengan key UNIK → dapat `data.url`
5. **Baru** hapus cover lama dari R2 (kalo ada)
6. `onCoverChange(data.url, false)` → update `form.cover_url`
7. Disimpan di database pas user klik "Simpan Buku"

Cache-Control `public, max-age=31536000, immutable` di proxy **OK** karena key unik tiap upload — browser selalu dapat URL baru.

## Development

```bash
npm install
npm run dev
```

Build lokal:
```bash
npm run build
```

Build output di `.vercel/output/static/`.

## Deploy

Push ke `master` → Cloudflare Pages auto-build & deploy.

Env vars di Cloudflare Dashboard > Pages > bunayya-putra > Settings > Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `IMAGE_SERVICE_URL` (opsional, AI image pipeline)
