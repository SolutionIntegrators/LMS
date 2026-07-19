// GA4 server-side monetization tracking via the Measurement Protocol.
// Fired from the Stripe webhook so every payment-link sale is recorded as a
// `purchase` event in GA4 (value + product), reliably and regardless of whether
// the buyer's browser is still open. Best-effort: never blocks purchase
// processing. Needs GA4_MEASUREMENT_ID (G-XXXXXXX) + GA4_API_SECRET (created in
// GA4 Admin → Data Streams → your stream → Measurement Protocol API secrets).
//
// Attribution note: with hosted Payment Links we have no browser client_id, so
// we derive a stable pseudo client_id from the buyer's email. Revenue is
// recorded correctly; acquisition source shows as direct/unassigned.

// Small deterministic hash → a GA-style "<int>.<int>" client_id (stable per email).
function clientIdFromEmail(email: string): string {
  let h = 2166136261
  const s = email.toLowerCase().trim()
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const a = (h >>> 0)
  // second component kept constant-ish per email for a stable id
  const b = ((h ^ 0x9e3779b9) >>> 0)
  return `${a}.${b}`
}

export async function sendGa4Purchase(opts: {
  email: string
  transactionId: string
  value: number | null
  currency?: string | null
  itemName: string
}): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET
  if (!measurementId || !apiSecret) return // not configured — skip silently
  if (opts.value == null || Number.isNaN(opts.value)) return // no monetary value → nothing to record
  try {
    const currency = (opts.currency || 'USD').toUpperCase()
    const body = {
      client_id: clientIdFromEmail(opts.email || opts.transactionId || 'anonymous'),
      // non_personalized_ads keeps this clean for a pure server-side conversion
      non_personalized_ads: true,
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: opts.transactionId,
            currency,
            value: Number(opts.value),
            items: [
              { item_name: opts.itemName, price: Number(opts.value), quantity: 1 },
            ],
          },
        },
      ],
    }
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    // MP returns 204 on success; it does NOT validate event correctness (use the
    // /debug/mp/collect endpoint for that). Log non-2xx only.
    if (!res.ok) console.error('GA4 purchase send failed:', res.status, (await res.text()).slice(0, 200))
  } catch (err) {
    console.error('sendGa4Purchase failed:', err instanceof Error ? err.message : err)
  }
}
