// Supabase Edge Function: guarda el secreto N8N_WEBHOOK_URL únicamente en el entorno de la función.
// n8n local no es accesible desde Supabase Cloud sin una URL HTTPS pública controlada por el operador.
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ ok: false, error: 'Método no permitido' }, { status: 405, headers: corsHeaders })
  try {
    const { message } = await request.json()
    if (typeof message !== 'string' || !message.trim() || message.length > 2000) throw new Error('Mensaje inválido.')
    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
    if (!webhookUrl) return Response.json({ ok: false, error: 'Integración n8n aún no configurada.' }, { status: 503, headers: corsHeaders })
    const upstream = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: message.trim() }) })
    const result = await upstream.json().catch(() => ({ ok: false, error: 'Respuesta no JSON de n8n.' }))
    return Response.json(result, { status: upstream.ok ? 200 : 502, headers: corsHeaders })
  } catch (error) { return Response.json({ ok: false, error: error.message || 'Solicitud inválida.' }, { status: 400, headers: corsHeaders }) }
})
