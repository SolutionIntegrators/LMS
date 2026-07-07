export const runtime = 'edge'

import { processPurchase } from '@/lib/grant'

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

  // Only act on completed checkouts; ack everything else so Stripe stops retrying.
  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true, ignored: event.type })
  }

  const session = event.data?.object ?? {}

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

  if (!lmsSlug) return Response.json({ received: true, ignored: 'no lms_slug in session metadata' })
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
