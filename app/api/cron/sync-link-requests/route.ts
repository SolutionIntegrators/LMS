export const runtime = 'edge'

import { listPendingLinkRequests, getPartnerContact, updateLinkRequestResult } from '@/lib/airtable'
import { createAffiliateLinksForPartner } from '@/lib/affiliate-links'

// Polls Airtable's "Link Requests" table for partner self-service link
// requests and creates the matching tracking link(s) — no Airtable-side
// automation needed. (This account's Airtable plan has no webhook/script
// action available in Automations, so this mirrors the same poll-based fix
// used for the ClickUp status sync in /api/cron/support-sync.)
//
// Schedule like the other cron endpoints, e.g. every 15-30 min:
// GET /api/cron/sync-link-requests?key=CRON_SECRET
export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const pending = await listPendingLinkRequests()
  let processed = 0

  for (const req of pending) {
    if (!req.partnerRecordId) {
      await updateLinkRequestResult(req.id, { createdLinkText: 'No partner linked on this request.', status: 'Error' })
      continue
    }
    const partner = await getPartnerContact(req.partnerRecordId)
    if (!partner?.email) {
      await updateLinkRequestResult(req.id, { createdLinkText: 'Partner has no Email Address on file.', status: 'Error' })
      continue
    }
    if (req.productNames.length === 0) {
      await updateLinkRequestResult(req.id, { createdLinkText: 'No product selected on this request.', status: 'Error' })
      continue
    }

    const results = await createAffiliateLinksForPartner({
      email: partner.email,
      partnerName: partner.name,
      productRefs: req.productNames,
    })
    const lines = results.map((r) => (r.error ? `${r.product}: FAILED — ${r.error}` : `${r.product}: ${r.link}`))
    const anyFailed = results.some((r) => r.error)
    await updateLinkRequestResult(req.id, { createdLinkText: lines.join('\n'), status: anyFailed ? 'Error' : 'Created' })
    processed++
  }

  return Response.json({ ok: true, pending: pending.length, processed })
}
