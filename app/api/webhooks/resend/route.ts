export const runtime = 'edge'

import { pushEmailIssue } from '@/lib/airtable'
import { sendAdminAlert } from '@/lib/email'

// Resend event webhook. Logs delivery problems to the hub's "Email Issues" table
// and emails the owner an alert for hard problems (bounce/complaint/failure).
// Auth: append ?key=CRON_SECRET to the endpoint URL in the Resend dashboard.
// Subscribe to: email.bounced, email.complained, email.delivery_delayed, email.failed.
const ALERT_EVENTS = new Set(['email.bounced', 'email.complained', 'email.failed'])
const LOG_EVENTS = new Set(['email.bounced', 'email.complained', 'email.failed', 'email.delivery_delayed'])

export async function POST(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let evt: any
  try { evt = JSON.parse(await request.text()) } catch { return new Response('bad json', { status: 400 }) }

  const type: string = evt?.type || ''
  const d = evt?.data ?? {}
  if (!LOG_EVENTS.has(type)) return Response.json({ received: true, ignored: type })

  const recipient: string = Array.isArray(d.to) ? d.to.join(', ') : (d.to || '')
  const subject: string = d.subject || ''
  const emailId: string = d.email_id || d.id || ''
  const bounceType: string = [d.bounce?.type, d.bounce?.subType].filter(Boolean).join(' / ')
  const detail: string = d.bounce?.message || d.reason || ''
  const occurredAt: string = (evt.created_at || new Date().toISOString()).slice(0, 10)

  await pushEmailIssue({
    emailId, recipient, subject,
    event: type.replace('email.', ''),
    bounceType: bounceType || null,
    detail: detail || null,
    occurredAt,
  })

  if (ALERT_EVENTS.has(type)) {
    const label = type.replace('email.', '')
    await sendAdminAlert(
      `⚠️ Goodies Shop email ${label}: ${recipient}`,
      `<p style="margin:0 0 14px;">An email just <strong>${label}</strong> in Resend.</p>
       <p style="margin:0 0 6px;"><strong>To:</strong> ${recipient}</p>
       <p style="margin:0 0 6px;"><strong>Subject:</strong> ${subject || '—'}</p>
       ${bounceType ? `<p style="margin:0 0 6px;"><strong>Type:</strong> ${bounceType}</p>` : ''}
       ${detail ? `<p style="margin:0 0 6px;color:#7A8A95;">${detail}</p>` : ''}
       <p style="margin:14px 0 0;color:#7A8A95;font-size:13px;">Logged to the Email Issues table in your hub. If the address is valid, deliver the login link another way (e.g. Gmail).</p>`
    )
  }

  return Response.json({ received: true, logged: type })
}
