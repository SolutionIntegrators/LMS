export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { sendGa4Purchase } from '@/lib/analytics'

// GA4 fallback: catches sales the client-side thank-you page never confirmed
// (buyer closed the tab before the redirect). Sends a server-side `purchase`
// (attribution shows direct) for confirmations that are:
//   • not client-confirmed, and not already server-sent
//   • older than GRACE_MINUTES (give the browser time to land first)
//   • within GA4's 72h Measurement Protocol acceptance window
// Schedule every ~15 min (Zapier Schedule / cron-job.org):
//   GET /api/cron/ga-fallback?key=CRON_SECRET
const GRACE_MINUTES = 15

export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = createServiceSupabaseClient() as any
  const now = Date.now()
  const cutoff = new Date(now - GRACE_MINUTES * 60_000).toISOString()
  const floor72h = new Date(now - 72 * 3600_000 + 5 * 60_000).toISOString() // small margin

  const { data: rows, error } = await db
    .from('stripe_checkout_confirmations')
    .select('session_id, transaction_ref, amount, currency, product_title, buyer_email')
    .is('client_confirmed_at', null)
    .is('server_sent_at', null)
    .lt('created_at', cutoff)
    .gt('created_at', floor72h)
    .limit(200)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  let sent = 0
  for (const r of rows ?? []) {
    const row = r as any
    if (row.amount == null) continue
    await sendGa4Purchase({
      email: row.buyer_email || row.session_id,
      transactionId: row.transaction_ref || row.session_id,
      value: Number(row.amount),
      currency: row.currency,
      itemName: row.product_title || 'Purchase',
    })
    await db.from('stripe_checkout_confirmations')
      .update({ server_sent_at: new Date().toISOString() } as any)
      .eq('session_id', row.session_id)
    sent++
  }

  return Response.json({ ok: true, checked: rows?.length ?? 0, sent })
}
