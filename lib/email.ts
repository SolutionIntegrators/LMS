// Transactional email via the Resend HTTP API (edge-safe). Best-effort: if
// RESEND_API_KEY is not configured, or the send fails, we log and move on so
// email problems never block access granting. Auth emails (invite / magic link
// / reset) go through Supabase SMTP instead — this is only for custom messages
// Supabase has no built-in type for, like "you now have access to X".

import { branding } from './branding'

const FROM = process.env.EMAIL_FROM || 'connect@solutionintegrators.us'

async function sendEmail(to: string, subject: string, html: string, cc?: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return // not configured — skip silently
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${branding.company} <${FROM}>`, to, cc, subject, html }),
    })
    if (!res.ok) console.error('Resend send failed:', res.status, (await res.text()).slice(0, 300))
  } catch (err) {
    console.error('sendEmail failed:', err instanceof Error ? err.message : err)
  }
}

// cc'd on every student-facing support ticket email, so the team always has
// visibility without needing to open ClickUp.
const SUPPORT_CC = process.env.ADMIN_ALERT_EMAIL || FROM

function shell(bodyInner: string): string {
  return `<div style="background:#FCF1E8;padding:32px 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(58,79,94,0.10);">
    <div style="background:#3A4F5E;padding:22px 32px;">
      <span style="color:#FCF1E8;font-family:Georgia,serif;font-size:18px;">${branding.company}</span>
    </div>
    <div style="padding:32px;color:#1E1E1E;font-size:15px;line-height:1.65;">
      ${bodyInner}
    </div>
    <div style="padding:18px 32px;border-top:1px solid #F0E0CC;color:#7A8A95;font-size:12px;">
      You’re receiving this because you have an account at ${branding.company}.
    </div>
  </div>
</div>`
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#A34F2B;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">${label}</a>`
}

// Sent to an EXISTING customer when they gain access to another product.
export async function sendProductAccessEmail(opts: {
  to: string
  fullName?: string | null
  productTitle: string
  productUrl: string
}): Promise<void> {
  const hi = opts.fullName ? `Hi ${opts.fullName},` : 'Hi there,'
  const html = shell(`
    <p style="margin:0 0 14px;">${hi}</p>
    <p style="margin:0 0 14px;">Good news — you now have access to <strong>${opts.productTitle}</strong> in your ${branding.company} portal. It’s ready for you whenever you are.</p>
    <p style="margin:22px 0;">${button(opts.productUrl, `Open ${opts.productTitle}`)}</p>
    <p style="margin:0;color:#7A8A95;font-size:13px;">If the button doesn’t work, paste this into your browser:<br><span style="color:#A34F2B;">${opts.productUrl}</span></p>
  `)
  await sendEmail(opts.to, `You now have access to ${opts.productTitle}`, html)
}

// Internal heads-up to the shop owner (e.g. an email bounced). Goes to
// ADMIN_ALERT_EMAIL, falling back to the FROM address (connect@…).
export async function sendAdminAlert(subject: string, bodyInner: string): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL || FROM
  await sendEmail(to, subject, shell(bodyInner))
}

// Admin heads-up on every new community thread, regardless of subscriptions.
export async function sendCommunityNewThreadAdminEmail(opts: {
  productTitle: string
  threadTitle: string
  authorLabel: string
  threadUrl: string
}): Promise<void> {
  await sendAdminAlert(
    `New community thread in ${opts.productTitle}: ${opts.threadTitle}`,
    `
    <p style="margin:0 0 14px;">${opts.authorLabel} posted a new thread in the <strong>${opts.productTitle}</strong> community:</p>
    <p style="margin:0 0 14px;font-weight:600;">${opts.threadTitle}</p>
    <p style="margin:22px 0;">${button(opts.threadUrl, 'View thread')}</p>
    `
  )
}

// Sent to course-subscribed, non-muted students on a new thread or reply.
export async function sendCommunityActivityEmail(opts: {
  to: string
  fullName?: string | null
  productTitle: string
  threadTitle: string
  kind: 'thread' | 'reply'
  authorLabel: string
  excerpt: string
  threadUrl: string
}): Promise<void> {
  const hi = opts.fullName ? `Hi ${opts.fullName},` : 'Hi there,'
  const what = opts.kind === 'thread' ? 'started a new thread' : 'replied'
  const html = shell(`
    <p style="margin:0 0 14px;">${hi}</p>
    <p style="margin:0 0 14px;">${opts.authorLabel} ${what} in the <strong>${opts.productTitle}</strong> community:</p>
    <p style="margin:0 0 6px;font-weight:600;">${opts.threadTitle}</p>
    <p style="margin:0 0 14px;color:#4a4a4a;">${opts.excerpt}</p>
    <p style="margin:22px 0;">${button(opts.threadUrl, 'View & reply')}</p>
    <p style="margin:14px 0 0;color:#7A8A95;font-size:13px;">Don't want emails for this thread? Open it and tap Mute — everything else in this community still reaches you.</p>
  `)
  await sendEmail(opts.to, `${opts.authorLabel} ${what} in ${opts.productTitle}`, html)
}

// Weekly "This Week in the Community" roundup, one per subscribed student.
export async function sendCommunityDigestEmail(opts: {
  to: string
  fullName?: string | null
  productTitle: string
  newThreads: Array<{ title: string; replyCount: number; url: string }>
  communityUrl: string
}): Promise<void> {
  const hi = opts.fullName ? `Hi ${opts.fullName},` : 'Hi there,'
  const rows = opts.newThreads.map((t) => `
    <li style="margin-bottom:10px;">
      <a href="${t.url}" style="color:#A34F2B;font-weight:600;text-decoration:none;">${t.title}</a>
      <span style="color:#7A8A95;font-size:13px;"> — ${t.replyCount} repl${t.replyCount === 1 ? 'y' : 'ies'}</span>
    </li>`).join('')
  const html = shell(`
    <p style="margin:0 0 14px;">${hi}</p>
    <p style="margin:0 0 14px;">Here's what happened this week in the <strong>${opts.productTitle}</strong> community:</p>
    <ul style="margin:0 0 18px;padding-left:20px;">${rows}</ul>
    <p style="margin:22px 0;">${button(opts.communityUrl, 'Visit the community')}</p>
  `)
  await sendEmail(opts.to, `This week in ${opts.productTitle}`, html)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Shared shape for both support-ticket update emails below — only the
// section heading and its body text differ.
function supportTicketUpdateEmail(opts: {
  fullName?: string | null
  description: string
  subject: string
  responseHeading: string
  responseBody: string
  supportUrl: string
}): string {
  const hi = opts.fullName ? `Hey ${opts.fullName}!` : 'Hey there!'
  const question = escapeHtml(opts.description || opts.subject).replace(/\n/g, '<br/>')
  return shell(`
    <p style="margin:0 0 14px;">${hi}</p>
    <p style="margin:0 0 14px;">Thank you so much for your recent support ticket. <em>In your support request you asked:</em></p>
    <blockquote style="margin:0 0 18px;padding:10px 16px;border-left:3px solid #F0E0CC;color:#4a4a4a;">${question}</blockquote>
    <p style="margin:0 0 6px;"><em>${opts.responseHeading}</em>:</p>
    <blockquote style="margin:0 0 18px;padding:10px 16px;border-left:3px solid #F0E0CC;color:#4a4a4a;">${opts.responseBody}</blockquote>
    <p style="margin:0 0 6px;"><em>What happens if I have more questions</em></p>
    <p style="margin:0 0 18px;">If you need to request support again please <a href="${opts.supportUrl}" style="color:#A34F2B;font-weight:600;text-decoration:none;">click here</a> to submit another support ticket.</p>
    <p style="margin:0 0 4px;">My team and I are here for you.</p>
    <p style="margin:0;">Ashley | ${branding.company}</p>
  `)
}

// Sent once, guarded by support_requests.resolved_notified_at, when a support
// ticket's client_visible_status flips to "resolved".
export async function sendSupportResolvedEmail(opts: {
  to: string
  fullName?: string | null
  subject: string
  description: string
  resolution: string | null
  supportUrl: string
}): Promise<void> {
  const resolution = opts.resolution
    ? escapeHtml(opts.resolution).replace(/\n/g, '<br/>')
    : 'Your ticket has been resolved — reply to this email if you have any follow-up questions.'
  const html = supportTicketUpdateEmail({
    fullName: opts.fullName, description: opts.description, subject: opts.subject,
    responseHeading: 'Support Response &amp; Answers', responseBody: resolution, supportUrl: opts.supportUrl,
  })
  await sendEmail(opts.to, `Your support request has been resolved: ${opts.subject}`, html, SUPPORT_CC)
}

// Sent whenever ClickUp's "Additional Info Needed" custom field is filled in
// (or changed) on a ticket that isn't resolved yet — see syncSupportTicketFromClickUp.
export async function sendSupportAdditionalInfoEmail(opts: {
  to: string
  fullName?: string | null
  subject: string
  description: string
  additionalInfoNeeded: string
  supportUrl: string
}): Promise<void> {
  const html = supportTicketUpdateEmail({
    fullName: opts.fullName, description: opts.description, subject: opts.subject,
    responseHeading: 'Support Response &amp; Request for Additional Info',
    responseBody: escapeHtml(opts.additionalInfoNeeded).replace(/\n/g, '<br/>'),
    supportUrl: opts.supportUrl,
  })
  await sendEmail(opts.to, `We need a bit more info on your support request: ${opts.subject}`, html, SUPPORT_CC)
}

// Sent to an affiliate/partner when their tracking link is created.
export async function sendAffiliateWelcomeEmail(opts: {
  to: string
  name?: string | null
  link: string
}): Promise<void> {
  const hi = opts.name ? `Hi ${opts.name},` : 'Hi there,'
  const html = shell(`
    <p style="margin:0 0 14px;">${hi}</p>
    <p style="margin:0 0 14px;">You’re all set up as a ${branding.company} partner. 🎉 Here’s your personal referral link — share it anywhere, and every click is tracked to you:</p>
    <p style="margin:18px 0;background:#FCF1E8;border-radius:8px;padding:12px 16px;word-break:break-all;"><a href="${opts.link}" style="color:#A34F2B;font-weight:600;text-decoration:none;">${opts.link}</a></p>
    <p style="margin:0 0 14px;">${button(opts.link, 'Test your link')}</p>
    <p style="margin:14px 0 0;color:#7A8A95;font-size:13px;">Reminder: you can see all of your tracking links and stats anytime in your <a href="${branding.links.partnerPortal}" style="color:#A34F2B;">Partner Portal</a>.</p>
  `)
  await sendEmail(opts.to, `Your ${branding.company} referral link is ready`, html)
}

// Sent to an affiliate/partner for self-service link requests — batched to
// one email per partner per processing run (rather than one email per link),
// since a partner can request several products' links at once. See
// /api/cron/sync-link-requests and /api/affiliate/create-link.
export async function sendAffiliateLinksEmail(opts: {
  to: string
  name?: string | null
  links: Array<{ product: string; url: string }>
}): Promise<void> {
  if (opts.links.length === 0) return
  const hi = opts.name ? `Hi ${opts.name},` : 'Hi there,'
  const plural = opts.links.length > 1
  const linksHtml = opts.links.map((l) => `
    <p style="margin:0 0 4px;font-weight:600;">${escapeHtml(l.product)}</p>
    <p style="margin:0 0 16px;background:#FCF1E8;border-radius:8px;padding:12px 16px;word-break:break-all;"><a href="${l.url}" style="color:#A34F2B;font-weight:600;text-decoration:none;">${l.url}</a></p>
  `).join('')
  const html = shell(`
    <p style="margin:0 0 14px;">${hi}</p>
    <p style="margin:0 0 14px;">You’re all set up as a ${branding.company} partner. 🎉 Here ${plural ? 'are your personal referral links' : "'s your personal referral link"} — share ${plural ? 'them' : 'it'} anywhere, and every click is tracked to you:</p>
    ${linksHtml}
    <p style="margin:14px 0 0;color:#7A8A95;font-size:13px;">Reminder: you can see all of your tracking links and stats anytime in your <a href="${branding.links.partnerPortal}" style="color:#A34F2B;">Partner Portal</a>.</p>
  `)
  const subject = plural ? `Your ${branding.company} referral links are ready` : `Your ${branding.company} referral link is ready`
  await sendEmail(opts.to, subject, html)
}
