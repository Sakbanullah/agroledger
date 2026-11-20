# AgroLedger

Aplikasi manajemen keuangan dan operasional untuk usaha perkebunan sawit dan karet. AgroLedger mencatat penjualan, menghitung komisi dan bagian pemilik kebun, mencatat settlement, kasbon/kredit, hasil panen, serta menampilkan ringkasan arus kas dari beberapa kebun sekaligus.

## Latar Belakang

Penghitungan hasil penjualan perkebunan dilakukan berulang setiap minggu: mencatat berat dan harga dari catatan tulisan tangan, menghitung bagian pemilik dan pekerja, lalu mengarsipkan transaksi. Dikerjakan manual, proses itu memakan waktu dan riwayatnya sulit ditelusuri kembali.

AgroLedger dibuat untuk mempercepat pekerjaan tersebut dengan memindahkannya ke sistem digital: pencatatan transaksi, perhitungan penjualan, dan pengarsipan riwayat agar lebih terstruktur. Bagian yang paling banyak menghabiskan waktu — membaca catatan karet dan mencocokkannya ke daftar pekerja — dapat dibantu lewat ekstraksi otomatis dari foto catatan, dengan hasil tetap diperiksa dan dikonfirmasi pengguna.

## Fitur Utama

- **Multi-kebun** — satu akun mengelola banyak kebun, masing-masing dengan komoditas (Sawit/Karet) dan jenis kepemilikan (`OWN` – milik sendiri, `RELATIVE` – milik saudara).
- **Workflow penjualan** — `PENDING` → `CONFIRMED` → `COMPLETED`. Draft dapat dihapus; penjualan yang sudah dikonfirmasi dibatasi perubahannya; pembatalan dan penghapusan penjualan tercatat.
- **Komisi sawit** — hanya untuk Sawit dari kebun `RELATIVE`. Tarif default Rp200/kg diatur di Settings, dapat di-_override_ per transaksi. Tarif dan nilai komisi yang berlaku disimpan per penjualan sehingga perubahan tarif tidak mengubah riwayat.
- **Settlement pemilik** (`owner-settlements`) — mencatat kewajiban kepada pemilik kebun relatif dan pembayarannya tanpa mengubah data penjualan.
- **Settlement pekerja karet** — input manual maupun hasil scan foto catatan; satu pekerja dapat ditimbang lebih dari sekali (lihat *Catatan pekerja karet*); potongan kasbon dihitung dari saldo kredit pekerja.
- **Kredit / kasbon** — akun kredit per orang beserta transaksi hutang dan pembayaran.
- **Transaksi keuangan** — pencatatan uang masuk/keluar di luar penjualan (operasional, warung, pertanian, transportasi, perawatan, lainnya).
- **Dashboard** — ringkasan lintas kebun: nilai penjualan, bagian pemilik, komisi, kas diterima, kas keluar, dan grafik arus kas harian.
- **Laporan** — laporan periodik dengan filter tanggal.
- **Panen** (`harvests`) — pencatatan hasil panen per kebun.
- **People** — data orang yang terlibat (pemilik, pekerja, dsb.).
- **AI / LLM Providers** — provider LLM dikonfigurasi dari Settings (Base URL, API key, model, timeout) untuk fitur scan catatan karet. Model dapat dipilih dari daftar yang disediakan endpoint provider.
- **Tema dan UI responsif** — light/dark mode yang tersimpan, layout menyesuaikan ukuran layar.

### Catatan pekerja karet

Satu pekerja bisa memiliki keping terlalu banyak untuk ditimbang sekali. Sistem menyimpan satu baris per pekerja per penjualan dengan daftar timbangan (tabel `RubberSaleWorkerWeighing`); keping dan berat pada baris pekerja adalah jumlah seluruh timbangan. Di alur scan, baris dengan pekerja yang sama dapat digabung sebagai timbang ulang.

## Teknologi yang Digunakan

### Frontend

| Teknologi | Versi | Fungsi |
|---|---|---|
| Next.js (App Router) | 16.3.4 | Routing halaman dan server rendering |
| React | 19.2.8 | Komponen antarmuka |
| TypeScript | 5.x | Type safety di sisi klien |
| Tailwind CSS | 4.x | Styling berbasis utility dan semantic token di `app/globals.css` |
| lucide-react | 1.x | Ikon |
| ESLint (`eslint-config-next`) | 9.x | Lint |

Komponen frontend berupa _client components_ yang memanggil backend langsung lewat `fetch`; seluruh panggilan API terpusat di `lib/api.ts`.

### Backend

| Teknologi | Versi | Fungsi |
|---|---|---|
| NestJS | 12.x | Modul, controller, service, dependency injection |
| Prisma ORM | 7.x | Skema, migrasi, dan query database (`@prisma/adapter-mariadb`) |
| MariaDB / MySQL | — | Database relasional |
| class-validator / class-transformer | 0.15 / 0.5 | Validasi DTO dengan `ValidationPipe` global |
| Node.js `http`/`https` | — | Transport HTTP khusus modul LLM (pengganti `fetch`) |
| `@google/genai`, `openai` | — | Dependensi saat modul AI masih memakai konfigurasi environment |
| Jest | 30.x | Unit test dan integration test |
| oxlint | 1.x | Lint backend |

## Arsitektur Sistem

```
Browser (Next.js 16, App Router)
        │  fetch JSON / multipart
        ▼
NestJS API (http://localhost:3001)
        │  Prisma Client + MariaDB adapter
        ▼
MariaDB (database "agroledger")

NestJS API ──► Provider LLM eksternal (OpenAI-compatible gateway atau Google Gemini)
```

- **Frontend** — halaman di `app/`, komponen di `components/`, akses API di `lib/api.ts`. Tidak ada API route Next.js; backend NestJS berjalan terpisah dan melakukan CORS hanya untuk `http://localhost:3000`.
- **Backend** — satu modul NestJS per domain (`backend/src/<domain>/`), berisi controller, service, dan DTO. Validasi request memakai `ValidationPipe` dengan `whitelist` dan `forbidNonWhitelisted`.
- **Database** — skema didefinisikan di `backend/prisma/schema.prisma`; riwayat perubahan lewat migrasi di `backend/prisma/migrations/`.
- **Modul LLM** (`backend/src/llm/`) — disusun dengan pemisahan layer: `domain` (aturan murni, mis. parsing daftar model dan isi balasan), `application` (use case, port), `infrastructure` (adapter OpenAI-compatible/Gemini, transport dengan pengecekan alamat, enkripsi AES-256-GCM untuk API key), dan `interface` (controller, DTO).
- **Integrasi eksternal** — hanya provider LLM, dipakai fitur scan catatan karet. Base URL dan kredensial disimpan di database; API key dienkripsi dan tidak pernah dikirim balik ke browser.

### Alur bisnis utama

1. Penjualan dicatat (farm, komoditas, berat, harga) sebagai `PENDING`.
2. Konfirmasi penjualan menghasilkan uang masuk sebesar nilai penjualan dan menetapkan komisi untuk Sawit + kebun `RELATIVE`.
3. Bagian pemilik = nilai penjualan − komisi, dicatat sebagai kewajiban sampai diselesaikan lewat owner settlement.
4. Settlement pekerja karet dihitung dari berat pekerja yang tersimpan dan memperhitungkan kasbon.
5. Dashboard merangkum seluruh kebun; komisi masuk ke kas kebun sendiri, bukan potongan dari penjualan pemilik.

Aturan rinci tersedia di `docs/BUSINESS-RULES.md` dan `docs/CASHFLOW-RULES.md`.

## Struktur Proyek

```
.
├─ app/                      # Halaman Next.js (transactions, people, farm, settlement,
│                            #   harvest, credit, workers, reports, owner-settlement, settings)
├─ components/               # Komponen UI (dashboard, settlement, farm, credit, settings, ui)
├─ lib/api.ts                # Klien API terpusat ke backend
├─ public/                   # Aset statis
├─ docs/                     # Dokumen aturan bisnis, cash flow, dan arsitektur
│   ├─ BUSINESS-RULES.md
│   ├─ CASHFLOW-RULES.md
│   └─ clean-architecture.md
├─ backend/
│   ├─ src/
│   │   ├─ ai/               # Fitur AI (scan catatan karet)
│   │   ├─ llm/              # Konfigurasi provider LLM (domain/application/infrastructure/interface)
│   │   ├─ sales/            # Penjualan, konfirmasi, pembatalan
│   │   ├─ settlements/      # Settlement pekerja karet
│   │   ├─ owner-settlements/# Settlement pemilik kebun relatif
│   │   ├─ rubber-workers/   # Input pekerja karet, fuzzy match, finalisasi draft
│   │   ├─ credit/           # Kredit / kasbon
│   │   ├─ money-transactions/, harvests/, farms/, commodities/
│   │   ├─ people/, workers/, reports/, settings/, health/
│   │   ├─ prisma/           # PrismaService
│   │   └─ generated/        # Prisma Client (hasil generate)
│   └─ prisma/               # schema.prisma dan migrasi
├─ package.json              # Dependensi dan script frontend
└─ README.md
```

## Persyaratan Sistem

- **Node.js** 20 atau lebih baru (dikembangkan dengan Node.js 24)
- **npm** (atau package manager lain yang kompatibel)
- **MariaDB** atau **MySQL** yang berjalan di `localhost:3306`

## Instalasi dan Konfigurasi

```bash
# 1. Dependensi frontend (root)
npm install

# 2. Dependensi backend
cd backend
npm install
```

## Konfigurasi Environment

Saat ini konfigurasi dibaca dari source dan file `.env` di folder `backend/` (diabaikan oleh Git). Jangan commit file tersebut.

### `backend/.env`

| Variabel | Wajib | Fungsi |
|---|---|---|
| `DATABASE_URL` | Ya | Koneksi database untuk Prisma CLI, mis. `mysql://root:@localhost:3306/agroledger`. Klien Prisma saat aplikasi berjalan memakai koneksi yang didefinisikan di `backend/src/prisma/prisma.service.ts`. |
| `LLM_ENCRYPTION_KEY` | Untuk provider LLM dengan API key | Kunci AES-256-GCM berukuran 32 byte (hex 64 karakter atau base64). Tanpa kunci ini provider yang memiliki API key tidak dapat disimpan. |
| `LLM_ALLOW_INSECURE_URLS` | Opsional | `true` untuk mengizinkan Base URL `http://` ke host lokal/privat selain loopback (mis. server LLM di jaringan lokal). |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | Opsional | Konfigurasi fallback, hanya dipakai bila tidak ada provider aktif di Settings. `LLM_PROVIDER` bernilai `openai` atau `gemini`. |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | Opsional | Dipakai sebagai `LLM_API_KEY` untuk provider fallback yang sesuai. |

Contoh:

```dotenv
DATABASE_URL="mysql://root:@localhost:3306/agroledger"
LLM_ENCRYPTION_KEY="<32 byte dalam hex atau base64>"
```

### Frontend

Alamat API backend ditetapkan di `lib/api.ts` (`http://localhost:3001`). Backend hanya mengizinkan CORS dari `http://localhost:3000`.

## Pengaturan Database

Jalankan migrasi dari folder `backend/`:

```bash
cd backend

# Membuat database `agroledger` bila belum ada, menerapkan migrasi,
# lalu men-generate Prisma Client ke src/generated/prisma
npx prisma migrate dev

# Alternatif: hanya generate client setelah paket di-install ulang
npx prisma generate
```

## Menjalankan Aplikasi

Jalankan backend dan frontend di dua terminal:

```bash
# Terminal 1 – backend (watch mode, port 3001)
cd backend
npm run start:dev

# Terminal 2 – frontend (port 3000)
npm install
npm run dev
```

Buka `http://localhost:3000`.

### Perintah lain

| Lokasi | Perintah | Fungsi |
|---|---|---|
| root | `npm run build` | Build production frontend |
| root | `npm run start` | Menjalankan hasil build frontend |
| root | `npm run lint` | ESLint |
| backend | `npm run build` | Build backend dengan Nest CLI |
| backend | `npm run lint` | oxlint |
| backend | `npm run test` | Jest |
| backend | `npx prisma migrate dev` | Terapkan migrasi database |

## Pengujian

- Unit test domain yang tidak bergantung framework dijalankan dengan Jest, mis. `backend/src/llm/domain/*.spec.ts`, `backend/src/reports/reports.calculator.spec.ts`, dan `backend/src/people/person-name.rules.spec.ts`:

  ```bash
  cd backend
  npx jest src/llm src/reports src/people
  ```

- Integration test menyentuh database MySQL nyata dan mengembalikan semua perubahan (transaksi yang di-rollback). Jalankan dengan ts-node:

  ```bash
  cd backend
  npx ts-node --transpile-only src/rubber-workers/weighings.integration.spec.ts
  npx ts-node --transpile-only src/rubber-workers/finalize-draft.integration.spec.ts
  ```

  Catatan: pada setup TypeScript saat ini, jalankan dengan `TS_NODE_COMPILER_OPTIONS='{"rootDir":"."}'` bila ts-node melaporkan error `TS5011`.

## Keterbatasan yang Diketahui

- **Autentikasi belum tersedia** — endpoint backend terbuka dan belum memakai JWT guard.
- Sebagian unit test yang meng-_import_ paket NestJS belum dapat dijalankan oleh Jest pada konfigurasi ESM saat ini; paket yang dimaksud gagal dimuat sebelum assertion dijalankan.
- `tsc --noEmit` pada backend masih melaporkan error tipe pada beberapa file test; build aplikasi (`nest build`) tetap berhasil.
- Skema Prisma mengandung model `LlmProvider`, sedangkan koneksi Prisma saat aplikasi berjalan memakai `@prisma/adapter-mariadb`.

## Dokumentasi Visual

Belum ada screenshot yang disertakan di repository.
