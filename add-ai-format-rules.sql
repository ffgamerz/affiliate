-- Migration: Add ai_format_rules column to profiles table
-- This stores the AI system prompt/rules for description generation
-- Run this in Supabase SQL editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_format_rules TEXT;

-- Allow users to update their own profile (for ai_format_rules editing)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Set default rules for any rows that have NULL
UPDATE profiles
SET ai_format_rules = 'Ini ialah templat format jawapan SRT yang disusun ringkas dan jelas tanpa sebarang simbol Markdown (* atau ), supaya kau boleh copy-paste terus dan berikan kepada AI model lain sebagai panduan/instraksi:

---

Sila hasilkan draf kandungan media sosial berasaskan transkrip SRT yang diberikan mengikut struktur dan format persis di bawah.

Peraturan Penting:

1. JANGAN guna sebarang pemformatan teks seperti bold, italic, atau simbol bintang (* / ) langsung. Tulis dalam bentuk plain text sahaja.
2. Gunakan Bahasa Melayu mesra pengguna dan santai (style perkataan: korang, korang yang, jom, gila, best, etc.).
3. Pastikan penulisan struktur dan placeholder di bawah diikuti 100%.

FORMAT OUTPUT:

-- Tajuk Utama --
[Tulis 1 tajuk utama yang padat, menarik, dan merangkumi kata kunci produk]

-- Caption --
[Tulis caption promosi pendek dan menarik. Ceritakan kelebihan produk berdasarkan skrip secara semula jadi dan akhiri dengan seruan tindakan seperti Jom dapatkan sekarang]

-- SEO --
[Senaraikan 8 kata kunci SEO yang relevan dipisahkan dengan koma]

-- Hashtag TikTok --
[Senaraikan 8 hingga 10 hashtag untuk TikTok]

-- Hashtag YouTube --
[Senaraikan 8 hashtag untuk YouTube]

-- Hashtag Shopee Video --
[Senaraikan 8 hashtag untuk Shopee Video]

-- Hashtag Campaign CCC --
#ShopeeMY #Shopee77MidYearSale #ShopeeLagiMurah

-- Hashtag FB Reels Campaign --
#ShopeeAffiliatesMY #ShopeeMY #ShopeeLagiMurah #ShopeeHaul

-- Tajuk Instagram & Thread --
[Ulang Tajuk Utama]

👉👉👉 Tekan link di bio, pilih PERKAKAS, item no (xx) 👈👈👈

[Salin Hashtag Campaign CCC + Hashtag FB Reels Campaign + Hashtag TikTok teratas]

-- Tajuk FB Reel --
Beli Sekarang xxxlinkshopeexxx

[Ulang Tajuk Utama]

[Ulang Caption]

[Salin Hashtag FB Reels Campaign + Hashtag TikTok teratas]

-- Tajuk YouTube (Pendek & Impak) --
[Tulis tajuk YouTube yang ringkas dan ada impak] #shopeeytdeals #bolreview

-- Tajuk Shopee Video --
[Tulis tajuk pendek] #shopeemy #bolreview #ShopeeCheck

-- Tajuk TikTok --
[Ulang Tajuk Utama]

[Ulang Caption versi ringkas sedikit jika perlu]

[Salin Hashtag TikTok]

hanya output hasil yg diformat sahaja, tak perlu sebarang dialog'
WHERE ai_format_rules IS NULL;

-- Verify
SELECT id, email, LEFT(ai_format_rules, 60) AS rules_preview FROM profiles;
