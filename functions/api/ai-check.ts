// Cloudflare Pages Function - AI API checker & model lister
// Routes:
//   GET  /api/ai-check          -> list available Gemini models (from Google API)
//   POST /api/ai-check {model}  -> test that a model works with the API key
// Environment variables:
//   GEMINI_API_KEY - Your Google Gemini API key

interface Env {
    GEMINI_API_KEY: string
}

function jsonHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
    const headers = jsonHeaders()

    if (context.request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers })
    }

    const { GEMINI_API_KEY } = context.env
    if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
            status: 500,
            headers,
        })
    }

    try {
        // ── GET: list available models ──
        if (context.request.method === 'GET') {
            const listResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}&pageSize=100`
            )
            if (!listResponse.ok) {
                const errText = await listResponse.text()
                return new Response(JSON.stringify({ error: `Gemini API error: ${errText}` }), {
                    status: 500,
                    headers,
                })
            }
            const listResult = await listResponse.json() as {
                models?: Array<{ name: string; supportedGenerationMethods?: string[] }>
            }
            const models = (listResult.models || [])
                .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
                .map((m) => m.name.replace(/^models\//, ''))
                .sort()
            return new Response(JSON.stringify({ models }), { status: 200, headers })
        }

        // ── POST: test a specific model ──
        if (context.request.method === 'POST') {
            const body = await context.request.json() as { model?: string }
            const model = (body.model || '').trim()
            if (!model) {
                return new Response(JSON.stringify({ error: 'model is required' }), {
                    status: 400,
                    headers,
                })
            }

            const testResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
                        generationConfig: { maxOutputTokens: 16, temperature: 0 },
                    }),
                }
            )

            if (!testResponse.ok) {
                const errText = await testResponse.text()
                return new Response(
                    JSON.stringify({ success: false, model, error: `Gemini API error: ${errText}` }),
                    { status: 200, headers }
                )
            }

            const result = await testResponse.json() as {
                candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>
            }
            const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

            return new Response(
                JSON.stringify({ success: true, model, reply }),
                { status: 200, headers }
            )
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers,
        })
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        return new Response(JSON.stringify({ error: `Internal server error: ${errorMessage}` }), {
            status: 500,
            headers,
        })
    }
}
