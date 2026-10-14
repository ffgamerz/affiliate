// Cloudflare Pages Function - Generate Description using Google Gemini AI
// Route: POST /api/generate-description
// Body: { video_id: string }
// Environment variables (set via Cloudflare Dashboard → Pages → your-project → Settings → Environment variables):
//   GEMINI_API_KEY       - Your Google Gemini API key
//   SUPABASE_URL         - Your Supabase project URL
//   SUPABASE_SERVICE_KEY - Your Supabase service_role key (for server-side writes)
//   BOT_API_KEY          - Shared secret for the bot CLI (sent as X-Bot-Key)
// Auth: Authorization: Bearer <Supabase access token of an admin user>  OR  X-Bot-Key: <BOT_API_KEY>
//
// Local dev: add to .dev.vars or wrangler.toml [env.dev.vars]

import { authenticate, callerKey, corsHeaders, json, rateLimited, UUID_RE } from '../_lib/security'

interface Env {
    GEMINI_API_KEY: string
    SUPABASE_URL: string
    SUPABASE_SERVICE_KEY: string
    BOT_API_KEY?: string // secret header value for the bot CLI (X-Bot-Key)
}

interface GenerateRequest {
    video_id: string
}

/** Default rules used if no ai_format_rules is saved in the profiles table */
const DEFAULT_RULES = `Ini ialah templat format jawapan SRT yang disusun ringkas dan jelas tanpa sebarang simbol Markdown (* atau ), supaya kau boleh copy-paste terus dan berikan kepada AI model lain sebagai panduan/instraksi:

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

hanya output hasil yg diformat sahaja, tak perlu sebarang dialog`;

/** Default AI model used if no ai_model is saved in the profiles table */
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'

const MODEL_RE = /^[A-Za-z0-9._-]{1,64}$/

/** Fetch the ai_format_rules and ai_model from the profiles table, falling back to defaults */
async function fetchAiConfig(supabaseUrl: string, serviceKey: string): Promise<{ rules: string; model: string }> {
    const url = `${supabaseUrl}/rest/v1/profiles?select=ai_format_rules,ai_model&is_admin=eq.true&limit=1`
    const resp = await fetch(url, {
        headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
        },
    })
    if (!resp.ok) return { rules: DEFAULT_RULES, model: DEFAULT_MODEL }
    const rows = await resp.json() as Array<{ ai_format_rules: string | null; ai_model: string | null }>
    return {
        rules: rows?.[0]?.ai_format_rules?.trim() || DEFAULT_RULES,
        model: MODEL_RE.test(rows?.[0]?.ai_model?.trim() || '') ? rows[0].ai_model!.trim() : DEFAULT_MODEL,
    }
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
    const { request, env } = context
    const headers = corsHeaders(request, 'POST, OPTIONS')

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers)

    try {
        const { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = env
        if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            console.error('generate-description: missing server configuration')
            return json({ error: 'Server not configured' }, 500, headers)
        }

        const caller = await authenticate(request, env)
        if (!caller) return json({ error: 'Unauthorized' }, 401, headers)
        if (rateLimited(callerKey(caller, request), 10, 60_000)) {
            return json({ error: 'Too many requests, cuba lagi sebentar.' }, 429, { ...headers, 'Retry-After': '60' })
        }

        let body: { video_id?: unknown }
        try { body = await request.json() } catch { return json({ error: 'Invalid JSON body' }, 400, headers) }
        const video_id = typeof body?.video_id === 'string' ? body.video_id.trim() : ''
        if (!UUID_RE.test(video_id)) return json({ error: 'video_id must be a valid UUID' }, 400, headers)

        const svc = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }

        // ── Step 1: Fetch video ──
        const fetchResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/videos?id=eq.${encodeURIComponent(video_id)}&select=title,srt,description`,
            { headers: svc },
        )
        if (!fetchResponse.ok) {
            console.error('generate-description: fetch video failed', fetchResponse.status, await fetchResponse.text())
            return json({ error: 'Failed to fetch video' }, 502, headers)
        }
        const videos = await fetchResponse.json() as Array<{ title: string; srt: string | null; description: string | null }>
        if (!videos?.length) return json({ error: 'Video not found' }, 404, headers)
        const video = videos[0]
        if (!video.srt) {
            return json({ error: 'No SRT/subtitle content found for this video. Please upload SRT content first.' }, 400, headers)
        }

        // ── Step 2: AI config ──
        const aiConfig = await fetchAiConfig(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // ── Step 3: Gemini ──
        const prompt = `Video Title: ${video.title || 'Untitled'}\n\nSRT Content (subtitle/script):\n${video.srt}\n\n---\n\nBased on the SRT content above, generate a compelling video description following these rules:\n${aiConfig.rules}`
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(aiConfig.model)}:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 8192, topP: 0.9, topK: 40 },
                }),
            },
        )
        if (!geminiResponse.ok) {
            console.error('generate-description: gemini error', geminiResponse.status, await geminiResponse.text())
            return json({ error: 'AI service error, cuba lagi.' }, 502, headers)
        }
        const geminiResult = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }> }
        const generatedText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
        if (!generatedText) return json({ error: 'AI returned empty response' }, 502, headers)

        // ── Step 4: Save (previous description is returned to the caller so it can be restored) ──
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/videos?id=eq.${encodeURIComponent(video_id)}`, {
            method: 'PATCH',
            headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ description: generatedText }),
        })
        if (!updateResponse.ok) {
            console.error('generate-description: update failed', updateResponse.status, await updateResponse.text())
            return json({ error: 'Failed to save description' }, 502, headers)
        }
        console.log('generate-description: ok', caller.kind, video_id)

        return json({
            success: true,
            message: 'Description berjaya dijana & disimpan!',
            description: generatedText,
            previous_description: video.description,
        }, 200, headers)
    } catch (err) {
        console.error('generate-description: unhandled', err)
        return json({ error: 'Internal server error' }, 500, headers)
    }
}
