export const runtime = 'edge'

import { processPurchase } from '@/lib/grant'
import { tagSubscriber } from '@/lib/kit'
import { pushAbandonedCart } from '@/lib/airtable'
import { createServiceSupabaseClient } from '@/lib/supabase-service'

// Stripe webhook: on a completed checkout (from our Payment Links), grant LMS
// access via the shared purchase pipeline. The Payment Link's metadata.lms_slug
// is copied onto the Checkout Session, so we grant the right product from the
// event alone. Signature-verified with STRIPE_WEBHOOK_SECRET (no Stripe key
// needed here). Configure the endpoint for the `checkout.session.completed` event.

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts: Record<string, string> = {}
  for (const kv of sigHeader.split(',')) {
    const [k, v] = kv.split('=')
    if (k && v) (parts[k.trim()] ??= v.trim())
  }
  const t = parts['t']; const v1 = parts['v1']
  if (!t || !v1) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`))
  return safeEqual(hex(sig), v1)
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return new Response('STRIPE_WEBHOOK_SECRET not configured', { status: 503 })

  const payload = await request.text()
  const sig = request.headers.get('stripe-signature') || ''
  if (!(await verifyStripeSignature(payload, sig, secret))) {
    return new Response('Invalid signature', { status: 400 })
  }

  let event: any
  try { event = JSON.parse(payload) } catch { return new Response('Invalid JSON', { status: 400 }) }

  const session = event.data?.object ?? {}

  // Abandoned cart: a payment-link checkout that expired without completing.
  // Record it as a metric in the Backoffice Abandoned Cart table (best-effort).
  if (event.type === 'checkout.session.expired') {
    if (!session.payment_link) return Response.json({ received: true, ignored: 'not a payment-link checkout' })
    const abFullName: string = session.customer_details?.name || ''
    const abAmount: number | null = typeof session.amount_total === 'number' ? session.amount_total / 100 : null
    const abSlug: string = session.metadata?.lms_slug || ''
    // Nicer product label: look up the LMS title by slug, else fall back.
    let productName = session.metadata?.product_name || abSlug || '(Stripe checkout)'
    if (abSlug) {
      try {
        const { data } = await createServiceSupabaseClient().from('products').select('title').eq('slug', abSlug).single()
        if (data?.title) productName = data.title
      } catch { /* best-effort */ }
    }
    await pushAbandonedCart({
      fullName: abFullName || null,
      amount: abAmount,
      productName,
      date: new Date().toISOString().slice(0, 10),
    })
    return Response.json({ received: true, abandoned_cart: true })
  }

  // Only act on completed checkouts beyond here; ack everything else.
  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true, ignored: event.type })
  }

  // Only grant for OUR LMS Payment Links. Three independent guards so no other
  // Stripe activity (Dubsado charges, manual invoices, other checkouts) can ever
  // trigger a grant:
  //   1. must be a one-time `payment` (not a subscription/setup session)
  //   2. must have originated from a Payment Link (session.payment_link set)
  //   3. must carry our metadata.lms_slug (only our product links set it)
  if (session.mode && session.mode !== 'payment') {
    return Response.json({ received: true, ignored: `mode ${session.mode}` })
  }
  if (!session.payment_link) {
    return Response.json({ received: true, ignored: 'not a payment-link checkout' })
  }

  const email: string = session.customer_details?.email || session.customer_email || ''
  const fullName: string = session.customer_details?.name || ''
  const lmsSlug: string = session.metadata?.lms_slug || ''
  const amount: number | null = typeof session.amount_total === 'number' ? session.amount_total / 100 : null
  // Stable per-purchase ref so retries dedupe (payout logs key on it).
  const transactionRef: string = session.payment_intent || session.id || ''

  // GA4 monetization: rather than fire the event here (which would show as
  // direct/unassigned), stash the sale against the Checkout Session id. The
  // client-side thank-you page reads it back and fires `purchase` from the
  // buyer's browser (preserving source/medium/campaign); a cron backstop
  // (/api/cron/ga-fallback) sends any the browser missed. Best-effort.
  let ga4ItemName = session.metadata?.product_name || lmsSlug || 'Stripe purchase'
  if (lmsSlug) {
    try {
      const { data } = await createServiceSupabaseClient().from('products').select('title').eq('slug', lmsSlug).single()
      if (data?.title) ga4ItemName = data.title
    } catch { /* best-effort */ }
  }
  try {
    if (session.id) {
      await (createServiceSupabaseClient() as any).from('stripe_checkout_confirmations').upsert({
        session_id: session.id,
        transaction_ref: transactionRef || null,
        amount,
        currency: (session.currency || 'usd'),
        product_title: ga4ItemName,
        buyer_email: email || null,
      } as any, { onConflict: 'session_id', ignoreDuplicates: false })
    }
  } catch (err) {
    console.error('stripe_checkout_confirmations upsert failed:', err instanceof Error ? err.message : err)
  }

  // Email-deliverable products (no LMS access): if the link carries a Kit tag
  // but no lms_slug, just tag the buyer in Kit and stop — no portal account,
  // no product grant. Delivery of the file is handled outside the LMS.
  const kitTag: string = session.metadata?.kit_tag || ''
  if (!lmsSlug) {
    if (kitTag && email) {
      await tagSubscriber(kitTag, email)
      return Response.json({ received: true, kit_tagged: kitTag, granted: false })
    }
    return Response.json({ received: true, ignored: 'no lms_slug / no kit_tag' })
  }
  if (!email) return Response.json({ received: true, warning: 'no customer email on session' })

  const result = await processPurchase({
    email,
    fullName: fullName || null,
    productSlug: lmsSlug,
    amount,
    transactionRef,
    source: 'stripe_webhook',
    airtableSource: 'Stripe',
    origin: new URL(request.url).origin,
    today: new Date().toISOString().slice(0, 10),
  })

  // Always 200 to Stripe unless our processing genuinely failed server-side.
  return Response.json({ received: true, ...result.body }, { status: result.status >= 500 ? 500 : 200 })
}
