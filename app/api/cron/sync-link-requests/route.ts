export const runtime = 'edge'

import { listPendingLinkRequests, getPartnerContact, updateLinkRequestResult } from '@/lib/airtable'
import { createAffiliateLinksForPartner } from '@/lib/affiliate-links'
import { sendAffiliateLinksEmail } from '@/lib/email'

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

  // Batched per partner across this whole run — if the same partner has
  // multiple pending requests (or one request spans several products), they
  // get ONE email covering everything created this run, not one per link.
  const newLinksByEmail = new Map<string, { name: string; links: Array<{ product: string; url: string }> }>()

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

    const { affiliateName, results } = await createAffiliateLinksForPartner({
      email: partner.email,
      partnerName: partner.name,
      productRefs: req.productNames,
    })
    const lines = results.map((r) => (r.error ? `${r.product}: FAILED — ${r.error}` : `${r.product}: ${r.link}`))
    const anyFailed = results.some((r) => r.error)
    await updateLinkRequestResult(req.id, { createdLinkText: lines.join('\n'), status: anyFailed ? 'Error' : 'Created' })
    processed++

    const newLinks = results.filter((r) => r.link && !r.existed && !r.error)
    if (newLinks.length > 0) {
      const email = partner.email.trim().toLowerCase()
      const entry = newLinksByEmail.get(email) ?? { name: affiliateName, links: [] }
      entry.links.push(...newLinks.map((r) => ({ product: r.product, url: r.link! })))
      newLinksByEmail.set(email, entry)
    }
  }

  for (const [email, entry] of newLinksByEmail) {
    await sendAffiliateLinksEmail({ to: email, name: entry.name, links: entry.links })
  }

  return Response.json({ ok: true, pending: pending.length, processed, emailed: newLinksByEmail.size })
}
