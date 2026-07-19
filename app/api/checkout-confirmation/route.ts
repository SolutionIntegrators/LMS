export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'

// Read a completed sale by Stripe Checkout Session id, for the client-side
// thank-you page (solutionintegrators.us/purchase-confirmed). Returns the
// amount/product so the page can fire a GA4 `purchase` from the buyer's browser
// (preserving source/medium/campaign). Also stamps client_confirmed_at so the
// server-side GA4 fallback skips this sale (no double-count).
//
// The session id (cs_...) is a long unguessable Stripe token and we only return
// non-sensitive commerce fields; CORS is limited to the shop origin.

const ALLOWED_ORIGIN = 'https://solutionintegrators.us'

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(request: Request): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get('session_id') || ''
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } })

  if (!sessionId.startsWith('cs_')) return json({ error: 'invalid session_id' }, 400)

  try {
    const db = createServiceSupabaseClient() as any
    const { data } = await db
      .from('stripe_checkout_confirmations')
      .select('transaction_ref, amount, currency, product_title, client_confirmed_at')
      .eq('session_id', sessionId)
      .single()

    // The webhook usually lands a beat before the browser redirect finishes, but
    // if we're early, tell the page to retry rather than record nothing.
    if (!data) return json({ pending: true }, 202)

    // Mark browser-confirmed (idempotent) so the fallback cron skips it.
    if (!(data as any).client_confirmed_at) {
      await db.from('stripe_checkout_confirmations')
        .update({ client_confirmed_at: new Date().toISOString() } as any)
        .eq('session_id', sessionId)
    }

    return json({
      transaction_id: (data as any).transaction_ref || sessionId,
      value: (data as any).amount != null ? Number((data as any).amount) : null,
      currency: ((data as any).currency || 'usd').toUpperCase(),
      item_name: (data as any).product_title || 'Purchase',
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'lookup failed' }, 500)
  }
}
