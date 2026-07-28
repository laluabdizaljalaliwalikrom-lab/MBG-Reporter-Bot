<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MBG Reporter Bot — Panduan AI

## Deskripsi Proyek
Sistem pelaporan **Makanan Bergizi Gratis (MBG)** untuk **Badan Gizi Nasional**. Petugas SPPG melaporkan distribusi makanan harian via Dashboard web, dan sistem menghasilkan poster laporan harian secara otomatis.

## Tech Stack
- **Framework:** Next.js 16.2.4 (App Router, Turbopack)
- **Bahasa:** TypeScript
- **UI:** React 19, Tailwind CSS v4, Lucide React icons
- **Database:** Supabase (PostgreSQL + Realtime + Storage)
- **Poster:** Satori (SVG) + @resvg/resvg-js (PNG)
- **Linting:** ESLint 9 dengan `eslint-config-next`

## Struktur Direktori

```
src/
├── app/
│   ├── api/
│   │   ├── generate-poster/route.ts     # Generate poster by ID
│   │   ├── reports/route.ts             # CRUD laporan via Dashboard
│   │   ├── settings/route.ts            # Baca/tulis system_settings
│   │   ├── sppg/route.ts                # CRUD master data SPPG
│   ├── dashboard/page.tsx               # Halaman dashboard (client wrapper)
│   ├── page.tsx                         # Halaman utama (render Dashboard)
│   ├── layout.tsx                       # Root layout
│   └── globals.css                      # Tailwind v4 imports
├── components/
│   └── Dashboard.tsx                    # Komponen dashboard utama (2335 baris)
├── lib/
│   ├── hooks/useLaporanRealtime.ts      # Hook realtime Supabase
│   ├── poster-service.ts                # Generate poster PNG via Satori
│   └── supabase.ts                      # Inisialisasi Supabase client
public/
├── fonts/
│   ├── Poppins-Bold.ttf                 # Font poster (fallback ke CDN)
│   └── Roboto-Bold.ttf
└── images/
    └── logo-bgn.png                     # Logo Badan Gizi Nasional
schema.sql                               # DDL untuk Supabase
```

## Database (Supabase)

### Tabel `mbg_reports`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| created_at | TIMESTAMPTZ | Default NOW() |
| whatsapp_from | TEXT | Nomor pengirim (dari Dashboard: "Dashboard") |
| raw_message | TEXT | Teks asli dari WA (tidak dipakai lagi) |
| extracted_data | JSONB | Data gizi, SPPG, B3 |
| status | TEXT | DRAFT, SENT, CANCELLED |
| tanggal | DATE | Tanggal laporan |
| porsi_besar | INTEGER | Jumlah porsi besar |
| porsi_kecil | INTEGER | Jumlah porsi kecil |
| menu | TEXT | Menu makanan |
| energi/protein/lemak/karbohidrat/serat | NUMERIC | Nilai gizi |
| photo_url | TEXT | URL foto makanan |
| poster_url | TEXT | URL poster yang di-generate |

### Tabel `sppg_data`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| nama_sppg | TEXT UNIQUE | Nama SPPG |
| porsi_kecil/porsi_besar | INTEGER | Default 0 |
| balita/bumil/busui | INTEGER | PMT B3, default 0 |
| kepala_sppg | TEXT | Nomor kontak Kepala SPPG (referensi) |
| pengawas_gizi | TEXT | Nomor kontak Pengawas Gizi (referensi) |

### Tabel `system_settings`
Key-value store (key TEXT UNIQUE, value TEXT). Untuk penyimpanan pengaturan sistem.

## API Routes (semua `export const dynamic = "force-dynamic"`)

### `POST /api/reports`
Digunakan Dashboard web. Action: `preview` (default), `confirm`, `cancel`.

### `GET/POST /api/settings`
Baca/tulis `system_settings`.

### `GET/POST/PUT/DELETE /api/sppg`
CRUD master data SPPG.

### `GET /api/generate-poster?id=xxx`
Generate ulang poster untuk report ID tertentu.

## Environment Variables
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_URL=  # Untuk client components
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Pola & Konvensi Kode
- **Client components:** Gunakan `"use client"` — Dashboard.tsx adalah SPA penuh
- **State management:** React state (useState) + Supabase Realtime via `useLaporanRealtime`
- **Gizi:** Porsi Besar (SD-SMP) dan Porsi Kecil (PAUD-TK) masing-masing punya Energi, Protein, Lemak, Karbohidrat, Serat
- **PMT B3:** Balita, Bumil (ibu hamil), Busui (ibu menyusui)
- **Poster:** Satori render JSX → SVG → Resvg → PNG → Upload ke Supabase Storage bucket `posters`
- **Font poster:** `public/fonts/Poppins-Bold.ttf` (fallback fetch dari GitHub CDN)
- **Nomor WA:** Simpan tanpa `@c.us`, format nomor Indonesia: `62` di awal, bukan `0`
- **Status flow:** DRAFT → SENT (atau CANCELLED dari DRAFT)
- **Semua API route** pakai `export const dynamic = "force-dynamic"` (no static render)
- **Hooks:** `useLaporanRealtime` di client untuk subscribe INSERT/UPDATE/DELETE ke `mbg_reports`
- **Ikon:** Import dari `lucide-react`
- **CSS:** `@import "tailwindcss"` (Tailwind v4), utility classes, dark theme (slate/indigo/emerald)
- **Dashboard SPA:** Tab: dashboard, laporan, sppg, pengaturan — semua dalam satu file Dashboard.tsx
- **Poster generated dalam rasio 1080×1350px (portrait)**

## Kepala SPPG & Pengawas Gizi
- Tabel `sppg_data` punya kolom `kepala_sppg` (TEXT) dan `pengawas_gizi` (TEXT) — nomor kontak sebagai referensi
- CRUD SPPG di Dashboard mencakup input untuk kedua nomor

## Catatan Penting
- Jangan edit `Dashboard.tsx` tanpa membaca seluruh komponen karena state management kompleks
- Saat menambah API route, tambahkan `export const dynamic = "force-dynamic"`
- Supabase client support baik `NEXT_PUBLIC_` maupun non-prefixed env vars
