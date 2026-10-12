# bol-affiliate — Video Tracker Buat Orang Lapo

Aplikasi web untuk menjejak video yang diupload ke YouTube, TikTok, Shopee Video, Facebook, Instagram dan Threads,
termasuk reupload, upload BolReview, kempen affiliate, bookmark dan penjanaan description AI (Gemini) daripada SRT.

Live: https://bol-affiliate.pages.dev

> ⚠️ **Peraturan:** JANGAN `git push` atau `wrangler pages deploy` tanpa kelulusan Azman. Sentiasa tanya
> "deploy to production?" dahulu. Uji di local (`npm run dev`) sebelum apa-apa perubahan.

## Kandungan
1. [Tech stack](#tech-stack)
2. [Struktur folder](#struktur-folder)
3. [Development local](#development-local)
4. [Environment & secrets](#environment--secrets)
5. [Deploy](#deploy)
6. [Database & model keselamatan](#database--model-keselamatan)
7. [API endpoints](#api-endpoints)
8. [CLI pada box (bukan dalam repo)](#cli-pada-box-bukan-dalam-repo)

## Tech stack
- **Frontend:** Vite + React 19 + TypeScript, MUI (tema iOS/macOS), React Router v7, Recharts
- **Database & auth:** Supabase (PostgreSQL + Auth) — `https://pvaeunslyvrtutbayxik.supabase.co`
- **Server:** Cloudflare Pages Functions (`functions/api/*`)
- **AI:** Google Gemini (model dipilih di Settings, disimpan dalam `profiles.ai_model`)
- **Hosting:** Cloudflare Pages, projek `bol-affiliate` (deploy manual dengan Wrangler)

## Struktur folder
```
functions/
  _lib/security.ts          # auth (admin JWT / X-Bot-Key), CORS, rate limit, UUID check (bukan route)
  api/generate-description.ts  # POST /api/generate-description
  api/ai-check.ts           # GET/POST /api/ai-check
src/
  pages/                    # Dashboard, Videos, BolReviewUpload, Reuploads, Campaigns, UploadCalendar,
                            # RandomPicker, Settings, Login, Register
  components/               # Layout, CampaignTierCard
  hooks/useAuth.tsx         # sesi + is_admin
  lib/supabase.ts           # Supabase client (anon key)
  lib/authFetch.ts          # fetch() yang hantar token sesi ke /api/*
  lib/campaigns.ts
supabase/                   # migrasi SQL (campaign-tables, video_type, status, rls-hardening.sql)
*.sql (root)                # migrasi lama (migrations.sql, admin-migration.sql, rpc-get-stats.sql, ...)
public/, dist/ (output build), wrangler.toml, .dev.vars.example, .env (VITE_*)
```

## Development local
```bash
cd ~/web/affiliate
npm install
npm run dev                 # frontend sahaja -> http://localhost:5173  (/api/* tak jalan di sini)
npm run build               # tsc -b && vite build -> dist/
npm run lint                # oxlint
```
Untuk uji Pages Functions (`/api/*`) secara local:
```bash
cp .dev.vars.example .dev.vars        # isi nilai sebenar; .dev.vars TIDAK dicommit
npm run build
npx wrangler pages dev dist --port 8788
# Jika wrangler mengadu compatibility date terlalu baru, tambah: --compatibility-date=2026-08-01
```
Buka http://localhost:8788 (localhost:5173/8788 dibenarkan oleh CORS).

## Environment & secrets
Nama sahaja — **jangan sesekali commit atau paste nilai**.

| Nama | Di mana | Kegunaan |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (frontend, awam) | URL Supabase |
| `VITE_SUPABASE_ANON_KEY` | `.env` (frontend, awam) | anon key (terbuka dalam JS; selamat kerana RLS) |
| `VITE_GENERATE_DESCRIPTION_URL` | `.env` (pilihan) | override URL endpoint generate (default `/api/generate-description`) |
| `GEMINI_API_KEY` | Cloudflare secret / `.dev.vars` | Google Gemini |
| `SUPABASE_URL` | Cloudflare secret / `.dev.vars` | URL Supabase untuk functions |
| `SUPABASE_SERVICE_KEY` | Cloudflare secret / `.dev.vars` | service_role key (bypass RLS) — rahsia |
| `BOT_API_KEY` | Cloudflare secret / `.dev.vars` | kunci rahsia untuk bot (header `X-Bot-Key`); nilai sama dengan `BOL_BOT_KEY` dalam `/workspace/bol-api/.env` di box |

Set/tukar secret production:
```bash
npx wrangler pages secret put BOT_API_KEY --project-name bol-affiliate   # nilai dibaca dari stdin
npx wrangler pages secret list --project-name bol-affiliate
```
Jika `BOT_API_KEY` ditukar, kemas kini juga `BOL_BOT_KEY` dalam `/workspace/bol-api/.env` (box).

## Deploy
**Perlu kelulusan Azman setiap kali.**
```bash
npm run build && npx wrangler pages deploy dist --project-name bol-affiliate
git push            # juga perlu kelulusan; jangan force-push
```
Secret baru berkuat kuasa pada deployment seterusnya.

## Database & model keselamatan

### Table utama
| Table | Isi |
|---|---|
| `videos` | id (uuid), title, description, srt, created_at, video_type (voice/no_voice), `tiktok_product_url`, `shopee_product_url`, dan bagi setiap platform (tiktok, youtube, facebook, instagram, shopee, threads): `<p>_url`, `<p>_upload_date`, `<p>_status` (publish/schedule/draft) |
| `reuploads` | reupload video ke platform (video_id, platform, url, upload_date, notes) |
| `bolreview_uploads` | upload ke page BolReview (video_id unik, url, tarikh) |
| `bookmarks` | bookmark per pengguna (user_id, video_id) |
| `profiles` | id = auth.users.id, email, `is_admin`, `ai_format_rules`, `ai_model` |
| `campaigns`, `campaign_tiers` | kempen affiliate & tier |
RPC statistik: `get_stats_single`, `get_stats_range`, `get_video_count_single`, `get_video_count_range` (`rpc-get-stats.sql`).

### Model keselamatan (sejak 13 Okt 2026)
- **RLS aktif pada semua 7 table.** `anon` tiada sebarang akses (permission denied).
- Data (`videos`, `reuploads`, `bolreview_uploads`, `campaigns`, `campaign_tiers`): baca & tulis **admin sahaja**
  (`public.is_admin()` = `profiles.is_admin` pengguna semasa).
- `bookmarks`: setiap pengguna hanya row sendiri. `profiles`: baca/kemas kini row sendiri; trigger
  `trg_protect_is_admin` menghalang pengguna menukar `is_admin` sendiri.
- `service_role` (Pages Functions, CLI box) bypass RLS.
- **Signup awam dimatikan** (`disable_signup = true`); halaman `/register` tidak boleh mencipta akaun.
- Skrip: `supabase/rls-hardening.sql` (sudah dijalankan di SQL Editor).

### Tambah pengguna baru
1. Supabase Dashboard → Authentication → Users → **Add user** (email + password, atau invite).
2. Profile dicipta automatik (trigger `on_auth_user_created`). Jadikan admin di SQL Editor:
   ```sql
   UPDATE profiles SET is_admin = true WHERE email = 'nama@contoh.com';
   ```
   Tanpa `is_admin = true`, pengguna boleh login tetapi tidak nampak data.

### Rollback RLS (kecemasan)
1. Pulihkan polisi lama daripada hasil `SELECT * FROM pg_policies WHERE schemaname='public';` yang disimpan sebelum
   hardening (jika ada), atau cipta semula polisi daripada fail migrasi lama.
2. Buang polisi `"admin read <table>"` / `"admin write <table>"`, kemudian:
   ```sql
   DROP TRIGGER IF EXISTS trg_protect_is_admin ON profiles;
   DROP FUNCTION IF EXISTS protect_is_admin();
   DROP FUNCTION IF EXISTS is_admin();   -- hanya selepas polisi yang menggunakannya dibuang
   ```
3. `GRANT` semula hak `anon` hanya jika benar-benar perlu (tidak disyorkan).
4. Signup: Dashboard → Authentication → Sign In / Providers → "Allow new users to sign up".

## API endpoints
Base: `https://bol-affiliate.pages.dev` (local: `http://localhost:8788`).

### Auth (kedua-dua endpoint)
Salah satu:
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>` — token sesi pengguna yang login dan `profiles.is_admin = true`.
  Website menghantarnya automatik melalui `src/lib/authFetch.ts`.
- `X-Bot-Key: <BOT_API_KEY>` — untuk bot/CLI.

**CORS:** hanya `https://bol-affiliate.pages.dev`, `https://*.bol-affiliate.pages.dev` (preview), `http://localhost:5173`,
`http://127.0.0.1:5173`, `http://localhost:8788`. Header dibenarkan: `Content-Type, Authorization, X-Bot-Key`.

**Rate limit** (anggaran, per isolate Cloudflare, tetingkap 60 s, per pengguna / per IP bot):
generate-description 10/min, ai-check 20/min → `429` + `Retry-After: 60`.

**Ralat** — mesej sentiasa generik (butiran dalaman hanya dalam log Cloudflare):
| Kod | Maksud |
|---|---|
| 400 | JSON tidak sah, `video_id` bukan UUID, tiada SRT, nama model tidak sah |
| 401 | tiada/salah token, bukan admin, atau `X-Bot-Key` salah |
| 404 | video tidak dijumpai |
| 405 | method tidak dibenarkan |
| 429 | terlalu banyak permintaan |
| 500 | server tidak dikonfigurasi / ralat dalaman |
| 502 | ralat Supabase atau Gemini |

### `POST /api/generate-description`
Jana description daripada `videos.srt` mengikut `profiles.ai_format_rules` & `ai_model` admin, kemudian **simpan
(ganti) `videos.description`**. Description lama dipulangkan dalam `previous_description`.

Request: `{ "video_id": "<uuid>" }`

Response 200:
```json
{ "success": true, "message": "Description berjaya dijana & disimpan!",
  "description": "<teks baru>", "previous_description": "<teks lama atau null>" }
```
Contoh:
```bash
# Bot
curl -X POST https://bol-affiliate.pages.dev/api/generate-description \
  -H "Content-Type: application/json" -H "X-Bot-Key: $BOT_API_KEY" \
  -d '{"video_id":"00000000-0000-0000-0000-000000000000"}'
# Admin (token sesi Supabase)
curl -X POST https://bol-affiliate.pages.dev/api/generate-description \
  -H "Content-Type: application/json" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -d '{"video_id":"<uuid>"}'
```

### `GET /api/ai-check` dan `POST /api/ai-check`
- `GET` → senarai model Gemini yang menyokong generateContent: `{ "models": ["gemini-…", …] }`
- `POST {"model":"gemini-3.6-flash"}` → uji model:
  `{ "success": true, "model": "…", "reply": "OK" }` atau `{ "success": false, "model": "…", "error": "Model test gagal (HTTP 404 NOT_FOUND)" }` (HTTP 200).
  Nama model mesti padan `[A-Za-z0-9._-]{1,64}`.
```bash
curl https://bol-affiliate.pages.dev/api/ai-check -H "X-Bot-Key: $BOT_API_KEY"
curl -X POST https://bol-affiliate.pages.dev/api/ai-check -H "Content-Type: application/json" \
  -H "X-Bot-Key: $BOT_API_KEY" -d '{"model":"gemini-3.6-flash"}'
```

## CLI pada box (bukan dalam repo)
Alat ini berada pada **box Linux bersama** (Grok Bot), bukan dalam repo atau Mac. Rahsia dalam `.env` / `token.json`
(chmod 600) — jangan print. Semua tulis = dry-run kecuali `--yes`. Output kebanyakannya JSON. README penuh ada
dalam setiap folder.

### `/workspace/bol-api` — data Supabase (service key)
`python3 /workspace/bol-api/bol.py <command>` — tiada command delete; setiap perubahan dicatat dalam `changes.log`.
```
list|search [--q TEKS] [--uploaded P] [--not-uploaded P] [--status P=STATUS] [--video-type voice|no_voice]
            [--has-video|--no-video] [--date-field P] [--from D] [--to D] [--sort F:asc|desc] [--limit N] [--offset N] [--fields ...]
get <id|tajuk> [--fields ...]
stats
update <ref> --platform P [--url URL] [--date YYYY-MM-DD] [--status publish|schedule|draft] [--yes]
set-product-url <ref> --platform tiktok|shopee --url URL [--yes]
reupload add <ref> --platform P --url URL --date D [--notes ...] [--yes] | reupload list [ref] [--platform P]
bolreview add <ref> --url URL --date D [--yes] | bolreview list [ref]
ai-generate <ref> [--yes]          # panggil /api/generate-description dengan X-Bot-Key (BOL_BOT_KEY)
drive auth-url | auth-code "<URL>" # setup sekali (Azman)
drive find <tajuk>                  # folder Drive video original
drive download <tajuk> [--all] [--out DIR] [--folder-id ID] [--contains]   # salinan bait-demi-bait
drive load-srt <ref> [--folder-id ID] [--yes] [--force]                    # SRT Drive -> videos.srt
rules show [--json] | sections | model [NAMA] [--yes]
rules replace-section "<Seksyen>" --text ... | --file F [--yes]
rules find-replace --old ... --new ... [--all] [--yes]
rules set --file F [--yes] | history | restore <backup> [--model-only] [--yes]   # backup di backups/
```
(P = tiktok, youtube, facebook, instagram, shopee, threads; `--id` untuk `rules` jika lebih dari satu admin.)

### `/workspace/yt-api` — YouTube Data API (channel Buat Orang Lapo)
```
yt_upload.py VIDEO TAJUK DESC_FILE [--tags a,b] [--publish-at "YYYY-MM-DD HH:MM"(MYT)] [--privacy public|unlisted|private]
             [--thumbnail IMG] [--category ID] [--notify-subscribers true|false] [--yes]
yt_edit.py list [-n N]
yt_edit.py update ID [--title ..] [--description-file F] [--tags ..] [--publish-at ..] [--privacy ..] [--category ..] [--yes]
yt_edit.py thumbnail ID IMG [--yes]
yt_comments.py list [--video ID] [-n N] [--unanswered] [--since YYYY-MM-DD] [--json]
yt_comments.py thread COMMENT_ID
yt_comments.py reply COMMENT_ID --text "..." [--yes]     # dilog dalam replies.log
yt_comments.py scopes
reauth.py url | reauth.py code '<URL localhost>'          # tambah skop youtube.force-ssl (Azman)
```
Kuota 10,000 unit/hari: list 1 unit/halaman, reply 50, upload ~1600. Komen perlu skop `youtube.force-ssl` (jalankan reauth).

### `/workspace/fb-api` — Facebook Page & Instagram (Graph API v26.0)
```
fb_comments.py list-posts [-n N]
fb_comments.py comments <object_id> [--unreplied]
fb_comments.py unreplied [--days D] [-n N]
fb_comments.py reply <comment_id> "<teks>" --yes
fb_comments.py like <comment_id> --yes
fb_comments.py hide <comment_id> on|off --yes
upload_reel.py VIDEO.mp4 CAPTION.txt ["YYYY-MM-DD HH:MM"]   # FB Reel, jadual dalam MYT
ig_post_reel.py VIDEO.mp4 CAPTION.txt [--no-feed] --yes     # IG Reel terus publish (tiada jadual)
ig_edit.py list [-n N] | limit | show <media_id> | comments <media_id> on|off
```
Nota: nama pengkomen FB disembunyikan sehingga app "BOL Uploader" Live + Advanced Access
(`pages_read_engagement`, `pages_read_user_content`). IG resumable upload kadang gagal (ProcessingFailedError);
`video_url` lebih stabil.
