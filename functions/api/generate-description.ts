// Cloudflare Pages Function - Generate Description using Google Gemini AI
// Route: POST /api/generate-description
// Body: { video_id: string }
// Environment variables (set via Cloudflare Dashboard → Pages → your-project → Settings → Environment variables):
//   GEMINI_API_KEY       - Your Google Gemini API key
//   SUPABASE_URL         - Your Supabase project URL
//   SUPABASE_SERVICE_KEY - Your Supabase service_role key (for server-side writes)
//
// Local dev: add to .dev.vars or wrangler.toml [env.dev.vars]

interface Env {
    GEMINI_API_KEY: string
    SUPABASE_URL: string
    SUPABASE_SERVICE_KEY: string
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
const DEFAULT_MODEL = 'gemini-3.6-flash'

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
        model: rows?.[0]?.ai_model?.trim() || DEFAULT_MODEL,
    }
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers })
    }

    if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers,
        })
    }

    try {
        const { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = context.env

        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
                status: 500,
                headers,
            })
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return new Response(JSON.stringify({ error: 'Supabase credentials are not configured' }), {
                status: 500,
                headers,
            })
        }

        const body: GenerateRequest = await context.request.json()
        const { video_id } = body

        if (!video_id) {
            return new Response(JSON.stringify({ error: 'video_id is required' }), {
                status: 400,
                headers,
            })
        }

        // ── Step 1: Fetch video data from Supabase ──
        const fetchUrl = `${SUPABASE_URL}/rest/v1/videos?id=eq.${video_id}&select=title,srt,description`
        const fetchResponse = await fetch(fetchUrl, {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
        })

        if (!fetchResponse.ok) {
            const errText = await fetchResponse.text()
            return new Response(JSON.stringify({ error: `Failed to fetch video: ${errText}` }), {
                status: 500,
                headers,
            })
        }

        const videos = await fetchResponse.json() as Array<{ title: string; srt: string | null; description: string | null }>

        if (!videos || videos.length === 0) {
            return new Response(JSON.stringify({ error: 'Video not found' }), {
                status: 404,
                headers,
            })
        }

        const video = videos[0]

        if (!video.srt) {
            return new Response(JSON.stringify({ error: 'No SRT/subtitle content found for this video. Please upload SRT content first.' }), {
                status: 400,
                headers,
            })
        }

        // ── Step 2: Fetch AI format rules & model from profiles table ──
        const aiConfig = await fetchAiConfig(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        const systemRules = aiConfig.rules

        // ── Step 3: Call Gemini API ──
        const prompt = `Video Title: ${video.title || 'Untitled'}\n\nSRT Content (subtitle/script):\n${video.srt}\n\n---\n\nBased on the SRT content above, generate a compelling video description following these rules:\n${systemRules}`

        const geminiPayload = {
            contents: [{
                parts: [{ text: prompt }],
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                topP: 0.9,
                topK: 40,
            },
        }

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${aiConfig.model}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiPayload),
            }
        )

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text()
            return new Response(JSON.stringify({ error: `Gemini API error: ${errText}` }), {
                status: 500,
                headers,
            })
        }

        const geminiResult = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }> }

        const generatedText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

        if (!generatedText) {
            return new Response(JSON.stringify({ error: 'Gemini returned empty response' }), {
                status: 500,
                headers,
            })
        }

        // ── Step 3: Update description in Supabase ──
        const updateUrl = `${SUPABASE_URL}/rest/v1/videos?id=eq.${video_id}`
        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ description: generatedText }),
        })

        if (!updateResponse.ok) {
            const errText = await updateResponse.text()
            return new Response(JSON.stringify({ error: `Failed to update description: ${errText}` }), {
                status: 500,
                headers,
            })
        }

        // ── Step 4: Return success ──
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Description berjaya dijana & disimpan!',
                description: generatedText,
            }),
            { status: 200, headers }
        )
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        return new Response(JSON.stringify({ error: `Internal server error: ${errorMessage}` }), {
            status: 500,
            headers,
        })
    }
}
