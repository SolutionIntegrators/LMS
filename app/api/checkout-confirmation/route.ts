export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { updateSaleAttribution } from '@/lib/airtable'

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
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id') || ''
  // Traffic attribution captured client-side (last-touch) on the thank-you page.
  const clean = (v: string | null) => (v || '').trim().slice(0, 200) || null
  const source = clean(url.searchParams.get('utm_source'))
  const medium = clean(url.searchParams.get('utm_medium'))
  const campaign = clean(url.searchParams.get('utm_campaign'))
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

    // Mark browser-confirmed (idempotent) so the fallback cron skips it, and
    // stash attribution. By the time the page has a value to render, the webhook
    // has finished (incl. the Airtable sale mirror), so the update below lands.
    const patch: Record<string, unknown> = {}
    if (!(data as any).client_confirmed_at) patch.client_confirmed_at = new Date().toISOString()
    if (source) patch.utm_source = source
    if (medium) patch.utm_medium = medium
    if (campaign) patch.utm_campaign = campaign
    if (Object.keys(patch).length > 0) {
      await db.from('stripe_checkout_confirmations').update(patch as any).eq('session_id', sessionId)
    }

    // Mirror the traffic source onto the Airtable Sales row (best-effort).
    if (source || medium || campaign) {
      await updateSaleAttribution((data as any).transaction_ref || '', { source, medium, campaign })
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
