# Panduan Deployment ke Cloudflare Pages

## Cara 1: Git Integration (Disyorkan)

### 1. Push ke GitHub
```bash
cd ~/web/affiliate
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Setup Cloudflare Pages
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih "Pages" > "Create a project"
3. Connect repository GitHub anda
4. Set build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Set environment variables:
   - `VITE_SUPABASE_URL` = URL project Supabase anda
   - `VITE_SUPABASE_ANON_KEY` = anon key project Supabase anda
6. Klik "Save and Deploy"

### 3. Deploy Otomatik
- Cloudflare akan build dan deploy secara automatik
- Setiap push ke branch main akan trigger deploy baru

## Cara 2: Wrangler CLI

Jika mahu guna wrangler, install dahulu:
```bash
npm install -g wrangler
```

Kemudian deploy:
```bash
cd ~/web/affiliate
npm run build
npx wrangler pages deploy dist
```

## Penting!
- Pastikan `.env` tidak di-commit (ada dalam .gitignore)
- Ganti nilai environment variables di Cloudflare dashboard, bukan dalam file