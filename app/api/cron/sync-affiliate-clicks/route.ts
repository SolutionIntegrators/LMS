export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { updatePartnerClicks } from '@/lib/airtable'

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

  // link_id -> affiliate_id, and affiliate_id -> email
  const [{ data: links }, { data: affiliates }, { data: clicks }] = await Promise.all([
    (db as any).from('affiliate_links').select('id, affiliate_id'),
    (db as any).from('affiliates').select('id, email'),
    (db as any).from('affiliate_clicks').select('link_id'),
  ])

  const linkToAff = new Map<string, string>()
  for (const l of (links ?? []) as any[]) linkToAff.set(l.id, l.affiliate_id)

  const clicksByAff = new Map<string, number>()
  for (const c of (clicks ?? []) as any[]) {
    const affId = linkToAff.get(c.link_id)
    if (affId) clicksByAff.set(affId, (clicksByAff.get(affId) ?? 0) + 1)
  }

  let synced = 0, skipped = 0
  for (const a of (affiliates ?? []) as any[]) {
    if (!a.email) { skipped++; continue }
    const total = clicksByAff.get(a.id) ?? 0
    const ok = await updatePartnerClicks(a.email, total)
    ok ? synced++ : skipped++
  }

  return Response.json({ ok: true, affiliates: (affiliates ?? []).length, synced, skipped })
}
