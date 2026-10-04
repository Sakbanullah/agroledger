# AgroLedger

## Deskripsi singkat
AgroLedger adalah sistem manajemen keuangan dan operasional untuk bisnis pertanian yang menangani dua komoditas utama: sawit (Sawit) dan karet (Karet). Sistem mencatat penjualan, komisi, settlement pemilik relatif, settlement pekerja, kredit/kasbon, hasil panen, serta menampilkan dashboard cash‑flow yang terintegrasi.

## Fitur utama
- **Multi‑farm**: mendukung banyak kebun, masing‑masing memiliki kepemilikan OWN atau RELATIVE dan komoditas Sawit/Karet.
- **Workflow penjualan**: status PENDING → CONFIRMED → COMPLETED, mencatat berat, harga, dan opsi override komisi.
- **Komisi**: berlaku hanya untuk penjualan Sawit dari kebun RELATIVE; default Rp200 / kg, dapat di‑override per transaksi.
- **Owner settlement**: melacak kewajiban kepada pemilik relatif dan mencatat pembayaran tanpa mengubah data penjualan.
- **Cash‑flow dashboard**: memisahkan Gross Sale, Own Income, Commission, Owner Share (Outstanding & Paid), Cash Received, Cash Paid.
- **Laporan periodik**: filter tanggal dengan UI responsif.
- **Pengaturan (Settings)**: mengubah tarif komisi default dan konfigurasi lain.
- **Manajemen orang & kebun**: CRUD untuk People, Farms.
- **Kasbon / Credit**: akun kredit, transaksi kredit.
- **Harvest**: pencatatan hasil panen per kebun.
- **Responsive UI**: layout adaptif 320 px‑1440 px+, tema gelap/terang dengan toggle persisten.

## Alur bisnis utama
1. **Pencatatan penjualan** – pengguna memasukkan farm, komoditas, berat, harga; untuk kebun RELATIVE (Sawit) sistem menghitung komisi.
2. **Penerimaan cash** – pembeli membayar full Gross Sale; uang masuk ke cash pool pengguna.
3. **Penetapan komisi** – hanya untuk Sawit + RELATIVE; komisi menjadi *Own Income* dan tidak mengurangi cash‑in.
4. **Perhitungan owner share** – `Owner Share = Gross Sale – Commission`; menjadi liabilitas sampai settlement.
5. **Owner settlement** – pembayaran kepada pemilik relatif mengurangi liabilitas, mencatat cash‑out.
6. **Karet** – penjualan Karet tidak melibatkan komisi dan mengikuti workflow terpisah.

## Tech stack
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS v4 (semantic token) + TypeScript.
- **Backend**: NestJS 12 + Prisma ORM + MariaDB + TypeScript.
- **Database**: MariaDB, skema dikelola oleh Prisma (`backend/prisma/schema.prisma`).
- **Testing**: Jest (unit & e2e) untuk backend, TypeScript compile‑time checks, ESLint.

## Gambaran arsitektur (singkat)
- **Presentation layer** – folder `app/` (halaman) dan `components/` (komponen UI) yang menggunakan API client terpusat `lib/api.ts`.
- **Application layer** – modul NestJS di `backend/src/` (misalnya `sales`, `owner-settlements`, `credits`).
- **Domain layer** – layanan (`*.service.ts`) yang menegakkan aturan bisnis (komisi, settlement, cash‑flow) sebagaimana dijelaskan di `docs/BUSINESS-RULES.md` & `docs/CASHFLOW-RULES.md`.
- **Infrastructure layer** – Prisma client (`backend/src/prisma/prisma.service.ts`) dan MariaDB.

## Modul utama (backend)
- `sales` – penjualan, konfirmasi, penyelesaian.
- `settlements` – settlement untuk kebun OWN.
- `owner-settlements` – settlement pemilik relatif.
- `credits` – akun kredit & transaksi.
- `rubber‑workers` – input pekerja karet, perhitungan.
- `harvests` – pencatatan hasil panen.
- `people` – manajemen orang.
- `farms` – definisi kebun, kepemilikan, komoditas.
- `reports` – endpoint laporan periodik.
- `settings` – konfigurasi global (misalnya tarif komisi default).

## Aturan finansial / cash‑flow penting
- **Komisi** hanya berlaku untuk *Sawit + RELATIVE*.
- **Tarif default**: Rp200 / kg (dapat di‑override per transaksi).
- **Perhitungan**: `Commission = Weight × AppliedRate`.
- **Owner Share**: `Owner Share = Gross Sale – Commission`.
- **Komisi** tidak mengurangi cash‑in buyer; cash‑in terjadi satu kali pada penerimaan pembayaran.
- **Konfirmasi penjualan** menghasilkan satu entri *Cash IN* (gross sale).
- **Owner settlement** menghasilkan *Cash OUT*; tidak mengubah data penjualan.
- **Karet** tidak memiliki komisi dalam semua skenario.

## Struktur project (ringkas)
```
├─ app/                 # Halaman Next.js
├─ components/          # Komponen UI React
├─ lib/                 # API client
├─ backend/             # Source NestJS
│   ├─ src/            # Modul, controller, service, DTO
│   └─ prisma/         # Skema Prisma & migrasi (di‑ignore)
├─ docs/                # Dokumen bisnis & cashflow
├─ public/              # Aset statis
├─ .gitignore
├─ package.json         # Frontend deps & scripts
├─ backend/package.json # Backend deps & scripts
└─ README.md           # Dokumentasi ini
```

## Cara menjalankan secara lokal
1. **Prasyarat**: Node.js 20+, npm 8+, MariaDB.
2. **Install dependensi**:
   ```bash
   npm install               # frontend
   cd backend && npm install  # backend
   ```
3. **Variabel environment** (buat file `.env` di root, jangan commit):
   - `DATABASE_URL` – koneksi Prisma, contoh `mysql://user:pass@localhost:3306/agroledger`.
   - `NEXT_PUBLIC_API_URL` – URL API backend, default `http://localhost:3001`.
   - `NEXT_PUBLIC_THEME` – `light` atau `dark` (opsional).
4. **Setup database**:
   ```bash
   npx prisma generate               # buat client @prisma/client
   npx prisma migrate dev --name init  # terapkan migrasi
   ```
5. **Jalankan layanan** (dua terminal):
   - Backend: `npm run dev` (di dalam folder `backend`, berjalan di port 3001).
   - Frontend: `npm run dev` (di root, berjalan di port 3000).
6. Buka `http://localhost:3000` di browser.

## Perintah pengembangan
- **Frontend**: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- **Backend**: `npm run dev` (watch mode), `npm run start`, `npm run lint`, `npm run test`, `npm run test:watch`.
- **Prisma**: `npx prisma generate`, `npx prisma migrate dev`.

## Status testing / verifikasi
- Semua unit test (`*.spec.ts`) dan test e2e di `backend/test/` lulus (`npm test`).
- Kompilasi TypeScript berhasil (`npx tsc --noEmit`).
- ESLint menghasilkan beberapa peringatan `any`, tetapi tidak menghentikan build.

## Status MVP saat ini
- Dark mode dengan toggle persisten.
- Migrasi semua utilitas warna ke semantic Tailwind token.
- UI responsif untuk semua breakpoints.
- Workflow penjualan lengkap dengan komisi, override, dan settlement pemilik.
- Dashboard menampilkan ringkasan cash‑flow multi‑farm.
- Laporan periodik dengan filter tanggal.
- Settings untuk mengubah tarif komisi default.
- Modul People, Farms, Transactions, Harvest, Credit/Kasbon, Rubber Workers berfungsi.
- Tidak ada mekanisme autentikasi/otorisasi (tercatat sebagai technical debt).

## Technical debt yang diketahui
- **Autentikasi** – endpoint API terbuka, belum ada JWT guard.
- **Penggunaan `any`** – beberapa layanan masih memakai tipe `any` untuk prototipe cepat.
- **AI modules** (`backend/src/ai/`) ada tetapi tidak terpakai dalam alur produksi.
- **Lingkungan** – variabel env harus di‑setup manual; tidak ada fallback default.
- **Beberapa komponen UI** masih menggunakan utilitas warna lama yang telah dimigrasi namun belum seluruhnya dibersihkan.

*Dokumentasi ini disusun berdasarkan kode yang ada dan dokumen bisnis resmi.*