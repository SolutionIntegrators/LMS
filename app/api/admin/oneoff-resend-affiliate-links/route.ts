export const runtime = 'edge'

import { sendAffiliateLinksEmail } from '@/lib/email'

// TEMPORARY one-off route: sends the "your links are ready" email to Oliva
// Lawson and Fran Rescigno, whose links were created by the very first
// sync-link-requests cron run — before this email feature existed, so they
// never got notified. Not tied to any DB record; hardcoded, single use.
// DELETE THIS FILE after it's been run once.
export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  await sendAffiliateLinksEmail({
    to: 'olivia@olivialawson.co',
    name: 'Oliva Lawson',
    links: [
      { product: 'Airtable Operations Hub', url: 'https://goodies.solutionintegrators.us/r/oliva-lawson-airtable-operations-hub' },
      { product: 'Airtable Support Ticketing Tool', url: 'https://goodies.solutionintegrators.us/r/oliva-lawson-airtable-support-ticketing-tool' },
      { product: 'Airtable Finance Tracker', url: 'https://goodies.solutionintegrators.us/r/oliva-lawson-airtable-finance-tracker' },
    ],
  })

  await sendAffiliateLinksEmail({
    to: 'hello@thepassionscollective.com',
    name: 'Fran Rescigno',
    links: [
      { product: 'Airtable Referral Partner Hub', url: 'https://goodies.solutionintegrators.us/r/fran-rescigno-airtable-referral-partner-hub' },
      { product: 'Quick Wins Workshop | Airtable - The Basics', url: 'https://goodies.solutionintegrators.us/r/fran-rescigno-quick-wins-workshop-airtable-the-basics' },
      { product: 'Airtable Support Ticketing Tool', url: 'https://goodies.solutionintegrators.us/r/fran-rescigno-airtable-support-ticketing-tool' },
      { product: 'Airtable Content + Launch Hub', url: 'https://goodies.solutionintegrators.us/r/fran-rescigno-airtable-content-launch-hub' },
      { product: 'Quick Wins Workshop | Creating SOPs in your PM Tool', url: 'https://goodies.solutionintegrators.us/r/fran-rescigno-quick-wins-workshop-creating-sops-in-your-pm-tool' },
      { product: 'Sell Anything With Dubsado', url: 'https://goodies.solutionintegrators.us/r/fran-rescigno-sell-anything-with-dubsado' },
      { product: 'Airtable Finance Tracker', url: 'https://goodies.solutionintegrators.us/r/fran-rescigno-airtable-finance-tracker' },
      { product: 'Airtable Operations Hub', url: 'https://goodies.solutionintegrators.us/r/fran-rescigno-airtable-operations-hub' },
    ],
  })

  return Response.json({ ok: true, sent: ['olivia@olivialawson.co', 'hello@thepassionscollective.com'] })
}
