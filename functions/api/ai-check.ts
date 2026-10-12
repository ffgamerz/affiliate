// Cloudflare Pages Function - AI API checker & model lister
// Routes:
//   GET  /api/ai-check          -> list available Gemini models (from Google API)
//   POST /api/ai-check {model}  -> test that a model works with the API key
// Auth: admin Supabase access token (Authorization: Bearer) or X-Bot-Key.
// Environment variables: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, BOT_API_KEY

import { authenticate, callerKey, corsHeaders, json, rateLimited } from '../_lib/security'

interface Env {
    GEMINI_API_KEY: string
    SUPABASE_URL: string
    SUPABASE_SERVICE_KEY: string
    BOT_API_KEY?: string
}

const MODEL_RE = /^[A-Za-z0-9._-]{1,64}$/

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
    const { request, env } = context
    const headers = corsHeaders(request, 'GET, POST, OPTIONS')

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers)

    const { GEMINI_API_KEY } = env
    if (!GEMINI_API_KEY) {
        console.error('ai-check: GEMINI_API_KEY missing')
        return json({ error: 'Server not configured' }, 500, headers)
    }

    const caller = await authenticate(request, env)
    if (!caller) return json({ error: 'Unauthorized' }, 401, headers)
    if (rateLimited('aicheck:' + callerKey(caller, request), 20, 60_000)) {
        return json({ error: 'Too many requests' }, 429, { ...headers, 'Retry-After': '60' })
    }

    const g = { 'x-goog-api-key': GEMINI_API_KEY }
    try {
        if (request.method === 'GET') {
            const listResponse = await fetch('https://generativelanguage.googleapis.com/v1/models?pageSize=100', { headers: g })
            if (!listResponse.ok) {
                console.error('ai-check: list error', listResponse.status, await listResponse.text())
                return json({ error: 'AI service error' }, 502, headers)
            }
            const listResult = await listResponse.json() as {
                models?: Array<{ name: string; supportedGenerationMethods?: string[] }>
            }
            const models = (listResult.models || [])
                .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
                .map((m) => m.name.replace(/^models\//, ''))
                .sort()
            return json({ models }, 200, headers)
        }

        let body: { model?: unknown }
        try { body = await request.json() } catch { return json({ error: 'Invalid JSON body' }, 400, headers) }
        const model = typeof body?.model === 'string' ? body.model.trim() : ''
        if (!MODEL_RE.test(model)) return json({ error: 'Invalid model name' }, 400, headers)

        const testResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...g },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
                    generationConfig: { maxOutputTokens: 16, temperature: 0 },
                }),
            },
        )
        if (!testResponse.ok) {
            const errText = await testResponse.text()
            console.error('ai-check: test error', testResponse.status, errText)
            // Only surface Google's short status message, never raw bodies.
            let reason = `HTTP ${testResponse.status}`
            try { const s = (JSON.parse(errText) as { error?: { status?: string } })?.error?.status; if (s) reason += ` ${s}` } catch { /* ignore */ }
            return json({ success: false, model, error: `Model test gagal (${reason})` }, 200, headers)
        }
        const result = await testResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }> }
        const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().slice(0, 100) || ''
        return json({ success: true, model, reply }, 200, headers)
    } catch (err) {
        console.error('ai-check: unhandled', err)
        return json({ error: 'Internal server error' }, 500, headers)
    }
}
