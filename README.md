npm# Video Tracker

Aplikasi untuk track video yang telah diupload ke platform-platform berbeza.

## Tech Stack
- Vite + React + TypeScript
- MUI (Material UI) dengan iOS/macOS theme
- Supabase (database + authentication)
- Cloudflare Pages (deployment)

## Setup

1. **Clone & Install**
```bash
cd ~/web/affiliate
npm install
```

2. **Setup Supabase**
- Buat project baru di [supabase.com](https://supabase.com)
- Copy URL dan anon key
- Rename `.env.example` ke `.env` dan isi nilai:
```bash
cp .env.example .env
```

3. **Create Database Tables**
Buka Supabase SQL Editor dan jalankan:

```sql
-- Create videos table
create table videos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  created_at timestamp default now()
);

-- Create video_platforms table
create table video_platforms (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references videos on delete cascade,
  platform text check (platform in ('youtube', 'tiktok', 'shopee', 'facebook', 'instagram', 'threads')),
  video_url text,
  upload_date date,
  views integer,
  likes integer,
  status text check (status in ('draft', 'published')) default 'draft',
  created_at timestamp default now()
);

-- Enable RLS
alter table videos enable row level security;
alter table video_platforms enable row level security;

-- Create policies
create policy "Users can view their own videos"
  on videos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own videos"
  on videos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own videos"
  on videos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own videos"
  on videos for delete
  using (auth.uid() = user_id);

create policy "Users can view their own video platforms"
  on video_platforms for select
  using (
    video_id in (
      select id from videos where user_id = auth.uid()
    )
  );

create policy "Users can insert their own video platforms"
  on video_platforms for insert
  with check (
    video_id in (
      select id from videos where user_id = auth.uid()
    )
  );

create policy "Users can update their own video platforms"
  on video_platforms for update
  using (
    video_id in (
      select id from videos where user_id = auth.uid()
    )
  );

create policy "Users can delete their own video platforms"
  on video_platforms for delete
  using (
    video_id in (
      select id from videos where user_id = auth.uid()
    )
  );
```

4. **Run Development**
```bash
npm run dev
```

## Deployment to Cloudflare Pages

1. **Build project**
```bash
npm run build
```

2. **Push ke GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

3. **Setup Cloudflare Pages**
- Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
- Pilih "Pages" > "Create a project"
- Connect repository GitHub anda
- Set build settings:
  - Build command: `npm run build`
  - Build output directory: `dist`
- Set environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

4. **Deploy**
- Cloudflare akan deploy secara automatik
- URL akan diberikan selepas build selesai

## Features
- ✅ Authentication (login/logout)
- ✅ Add/Edit/Delete video
- ✅ Track platform URLs (YouTube, TikTok, Shopee, Facebook, Instagram, Threads)
- ✅ Status tracking (draft/published)
- ✅ Dashboard statistik