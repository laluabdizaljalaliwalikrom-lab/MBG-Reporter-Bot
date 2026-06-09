<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MBG Reporter Bot — Panduan AI

## Deskripsi Proyek
Sistem pelaporan **Makanan Bergizi Gratis (MBG)** untuk **Badan Gizi Nasional**. Petugas SPPG melaporkan distribusi makanan harian via WhatsApp, AI (Gemini) mengekstrak data secara otomatis, dan sistem menghasilkan poster serta mengirimkannya ke grup WhatsApp pemangku kepentingan.

## Tech Stack
- **Framework:** Next.js 16.2.4 (App Router, Turbopack)
- **Bahasa:** TypeScript
- **UI:** React 19, Tailwind CSS v4, Lucide React icons
- **Database:** Supabase (PostgreSQL + Realtime + Storage)
- **AI:** Google Gemini 2.5 Flash (via `@google/generative-ai`)
- **Poster:** Satori (SVG) + @resvg/resvg-js (PNG)
- **WhatsApp Gateway:** MPWA (https://wa.gusdin.my.id)
- **Linting:** ESLint 9 dengan `eslint-config-next`

## Struktur Direktori

```
src/
├── app/
│   ├── api/
│   │   ├── check-connections/route.ts   # Cek Gemini + WhatsApp
│   │   ├── check-gemini/route.ts        # Cek Gemini saja
│   │   ├── generate-poster/route.ts     # Generate poster by ID
│   │   ├── reports/route.ts             # CRUD laporan via Dashboard
│   │   ├── settings/route.ts            # Baca/tulis system_settings
│   │   ├── settings/groups/route.ts     # Ambil daftar grup WA dari MPWA
│   │   ├── sppg/route.ts                # CRUD master data SPPG
│   │   └── webhook/whatsapp/route.ts    # Webhook utama WhatsApp
│   ├── dashboard/page.tsx               # Halaman dashboard (client wrapper)
│   ├── page.tsx                         # Halaman utama (render Dashboard)
│   ├── layout.tsx                       # Root layout
│   └── globals.css                      # Tailwind v4 imports
├── components/
│   └── Dashboard.tsx                    # Komponen dashboard utama (2143 baris)
├── lib/
│   ├── gemini.ts                        # Inisialisasi & cek koneksi Gemini
│   ├── hooks/useLaporanRealtime.ts      # Hook realtime Supabase
│   ├── parseManualInput.ts              # Parser manual: MANUAL_MBG format
│   ├── poster-service.ts                # Generate poster PNG via Satori
│   ├── supabase.ts                      # Inisialisasi Supabase client
│   └── whatsapp.ts                      # Kirim pesan/media WA via MPWA
public/
├── fonts/
│   ├── Poppins-Bold.ttf                 # Font poster (fallback ke CDN)
│   └── Roboto-Bold.ttf
└── images/
    └── logo-bgn.png                     # Logo Badan Gizi Nasional
schema.sql                               # DDL untuk Supabase
test-webhook.js                          # Script test webhook lokal
```

## Database (Supabase)

### Tabel `mbg_reports`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| created_at | TIMESTAMPTZ | Default NOW() |
| whatsapp_from | TEXT | Nomor pengirim |
| raw_message | TEXT | Teks asli dari WA |
| extracted_data | JSONB | Hasil ekstraksi Gemini |
| status | TEXT | DRAFT, SENT, APPROVED, CANCELLED |
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
| kepala_sppg | TEXT | Nomor WA Kepala SPPG (format 62xxx) |
| pengawas_gizi | TEXT | Nomor WA Pengawas Gizi (format 62xxx) |

### Tabel `system_settings`
Key-value store (key TEXT UNIQUE, value TEXT). Digunakan untuk `mpwa_sender`.

## API Routes (semua `export const dynamic = "force-dynamic"`)

### `POST /api/webhook/whatsapp`
Webhook utama dari MPWA. State machine:
- **Kondisi A** (teks baru): Deteksi keyword `MBG`/`LAPORAN`/`MANUAL_MBG` → ekstrak via Gemini/parser manual → INSERT draft
- **Kondisi B** (foto): Upload ke Storage → generate poster → kirim preview ke user → minta konfirmasi `YA`/`REVISI`
- **Kondisi C** (`YA`): Generate poster → kirim ke grup stakeholder → update status `SENT`
- **Kondisi D** (`REVISI`): Update status `CANCELLED`

### `POST /api/reports`
Digunakan Dashboard web. Action: `preview` (default), `confirm`, `cancel`.

### `GET/POST /api/settings`
Baca/tulis `system_settings`. Key: `mpwa_sender`.

### `GET /api/settings/groups`
Ambil daftar grup WhatsApp dari MPWA Gateway.

### `GET/POST/PUT/DELETE /api/sppg`
CRUD master data SPPG.

### `GET /api/check-connections` & `/api/check-gemini`
Test koneksi ke Gemini API dan WhatsApp Gateway.

### `GET /api/generate-poster?id=xxx`
Generate ulang poster untuk report ID tertentu.

## Environment Variables (`.env.example`)
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
GEMINI_API_KEY=
WHATSAPP_API_KEY=          # MPWA API Key
WHATSAPP_API_URL=          # https://gate.whapi.cloud/messages/text (legacy)
WHATSAPP_PHONE_ID=         # Nomor pengirim (fallback)
MPWA_API_KEY=              # Alternatif WHATSAPP_API_KEY
MPWA_SENDER=               # Alternatif WHATSAPP_PHONE_ID
WHATSAPP_GROUP_ID=         # ID grup tujuan (misal: 628xxx@g.us)
NEXT_PUBLIC_SUPABASE_URL=  # Untuk client components
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Pola & Konvensi Kode
- **Exported data dari Gemini:** JSONB dengan struktur `{ "Porsi Besar": { Jumlah, Energi, ... }, "Porsi Kecil": { ... }, "B3": { Balita, Bumil, Busui }, sppg_name, sppg_address }`
- **Format manual input:** Awali teks dengan `MANUAL_MBG`, lalu `Key: Value` per baris
- **Client components:** Gunakan `"use client"` — Dashboard.tsx adalah SPA penuh
- **State management:** React state (useState) + Supabase Realtime via `useLaporanRealtime`
- **Gizi:** Porsi Besar (SD-SMP) dan Porsi Kecil (PAUD-TK) masing-masing punya Energi, Protein, Lemak, Karbohidrat, Serat
- **PMT B3:** Balita, Bumil (ibu hamil), Busui (ibu menyusui)
- **Poster:** Satori render JSX → SVG → Resvg → PNG → Upload ke Supabase Storage bucket `posters`
- **Font poster:** `public/fonts/Poppins-Bold.ttf` (fallback fetch dari GitHub CDN)
- **Nomor WA:** Simpan tanpa `@c.us`, format nomor Indonesia: `62` di awal, bukan `0`
- **Status flow:** DRAFT → APPROVED → SENT (atau CANCELLED dari DRAFT)
- **Semua API route** pakai `export const dynamic = "force-dynamic"` (no static render)
- **Hooks:** `useLaporanRealtime` di client untuk subscribe INSERT/UPDATE/DELETE ke `mbg_reports`
- **Ikon:** Import dari `lucide-react`
- **CSS:** `@import "tailwindcss"` (Tailwind v4), utility classes, dark theme (slate/indigo/emerald)
- **Dashboard SPA:** Tab: dashboard, laporan, sppg, pengaturan — semua dalam satu file Dashboard.tsx

## Webhook State Machine (`/api/webhook/whatsapp`)

### Deteksi Grup vs Personal Chat
Webhook membedakan asal pesan via akhiran `senderRaw`:
- **`@g.us`** → Grup WhatsApp
- **`@s.whatsapp.net` / `@c.us` / digit saja** → Personal chat

### Ekstraksi Nomor Pengirim Asli
Untuk **pesan grup**, `senderRaw` adalah JID grup (`xxx@g.us`), BUKAN nomor pengirim.
Bot harus extract `participant` dari berbagai level payload:
- Whapi: `msg.key?.participant`
- MPWA: `body.key?.participant`
- Jika tidak ditemukan, gunakan `senderRaw` sebagai fallback

Setelah ekstraksi, nomor dibersihkan dengan `replace(/\D/g, "")`.
Jika nomor tidak dimulai dengan `62`, webhook return error `invalid_sender`.
**Tidak ada fallback ke nomor statis** — cegah kirim balasan ke nomor salah.

### Logika Filter (berdasarkan asal pesan)

| Kondisi | Personal Chat | Grup Chat |
|---|---|---|
| **C** — Pesan `YA` | ✅ Proses konfirmasi kirim | ❌ Ignored (false positive risk) |
| **D** — Pesan `REVISI` | ✅ Proses pembatalan | ❌ Ignored |
| **B** — Foto | ✅ Upload & generate poster (jika ada draft) | ❌ Ignored |
| **A** — Teks baru | Keyword: `MBG` / `LAPORAN` / `MANUAL_MBG` (case insensitive, `includes`) | Keyword strict: `MANUAL_MBG`, diawali `LAPORAN`, atau diawali `MBG` (regex `^MBG\b`) |
| Fallback | `command_not_recognized` | `command_not_recognized` |

### Alasan
- Grup WA ramai dengan chat random; keyword `MBG` bisa muncul di percakapan biasa
- "YA" di grup bisa diketik anggota lain dan salah mengirim draft milik orang lain
- Foto di grup bisa memicu poster generation yang tidak diinginkan
- Hanya teks yang jelas-jelas laporan (diawali `LAPORAN` atau `MBG`) diproses dari grup

## Kepala SPPG & Pengawas Gizi
- Tabel `sppg_data` punya kolom `kepala_sppg` (TEXT) dan `pengawas_gizi` (TEXT) — nomor WhatsApp (format 62xxx)
- CRUD SPPG di Dashboard mencakup input untuk kedua nomor
- Form laporan harian punya checkbox **"Kirim juga ke Kepala SPPG"** dan **"Kirim juga ke Pengawas Gizi"** yang muncul otomatis jika SPPG yang dipilih memiliki nomor masing-masing
- Saat dikirim, poster + caption dikirim ke grup tujuan + nomor Kepala SPPG (jika dicentang) + nomor Pengawas Gizi (jika dicentang)

## Catatan Penting
- Jangan edit `Dashboard.tsx` tanpa membaca seluruh komponen karena state management kompleks
- Saat menambah API route, tambahkan `export const dynamic = "force-dynamic"`
- Jangan ubah struktur JSONB `extracted_data` tanpa menyesuaikan mapper di webhook
- Gemini model: `gemini-2.5-flash` dengan response MIME type `application/json`
- Supabase client support baik `NEXT_PUBLIC_` maupun non-prefixed env vars
- Poster generated dalam rasio 1080×1350px (portrait)
- Untuk test webhook lokal, jalankan `node test-webhook.js` (pastikan server nyala)
