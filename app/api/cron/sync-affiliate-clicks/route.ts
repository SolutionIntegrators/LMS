export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { updatePartnerClicks, updateAffiliateLinkClicks } from '@/lib/airtable'

// Daily click-total sync: totals each affiliate's clicks across all their links
// and writes the number onto their Backoffice partner row ("Referral Clicks").
// Trigger once a day from an external scheduler (e.g. Zapier Schedule → Webhook,
// or cron-job.org). Auth: pass CRON_SECRET as ?key= or the x-cron-key header.

export async function POST(request: Request) { return run(request) }
export async function GET(request: Request) { return run(request) }

async function run(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret) return new Response('CRON_SECRET not configured', { status: 503 })
  const url = new URL(request.url)
  const provided = url.searchParams.get('key') ?? request.headers.get('x-cron-key') ?? ''
  if (provided !== secret) return new Response('Unauthorized', { status: 401 })

  const db = createServiceSupabaseClient()

  const [{ data: links }, { data: affiliates }, { data: clicks }] = await Promise.all([
    (db as any).from('affiliate_links').select('id, code, affiliate_id'),
    (db as any).from('affiliates').select('id, email'),
    (db as any).from('affiliate_clicks').select('link_id'),
  ])

  const clicksByLink = new Map<string, number>()
  for (const c of (clicks ?? []) as any[]) clicksByLink.set(c.link_id, (clicksByLink.get(c.link_id) ?? 0) + 1)

  // Per-link click totals → each row in the Affiliate Links table.
  let linksSynced = 0
  const clicksByAff = new Map<string, number>()
  for (const l of (links ?? []) as any[]) {
    const n = clicksByLink.get(l.id) ?? 0
    clicksByAff.set(l.affiliate_id, (clicksByAff.get(l.affiliate_id) ?? 0) + n)
    if (await updateAffiliateLinkClicks(l.code, n)) linksSynced++
  }

  // Per-partner total → the partner row.
  let partnersSynced = 0
  for (const a of (affiliates ?? []) as any[]) {
    if (!a.email) continue
    if (await updatePartnerClicks(a.email, clicksByAff.get(a.id) ?? 0)) partnersSynced++
  }

  return Response.json({ ok: true, links: (links ?? []).length, linksSynced, partnersSynced })
}
