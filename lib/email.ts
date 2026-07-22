// Transactional email via the Resend HTTP API (edge-safe). Best-effort: if
// RESEND_API_KEY is not configured, or the send fails, we log and move on so
// email problems never block access granting. Auth emails (invite / magic link
// / reset) go through Supabase SMTP instead — this is only for custom messages
// Supabase has no built-in type for, like "you now have access to X".

import { branding } from './branding'

const FROM = process.env.EMAIL_FROM || 'connect@solutionintegrators.us'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return // not configured — skip silently
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${branding.company} <${FROM}>`, to, subject, html }),
    })
    if (!res.ok) console.error('Resend send failed:', res.status, (await res.text()).slice(0, 300))
  } catch (err) {
    console.error('sendEmail failed:', err instanceof Error ? err.message : err)
  }
}

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
    <p style="margin:14px 0 0;color:#7A8A95;font-size:13px;">Your link (and referral stats) also live in your partner hub.</p>
  `)
  await sendEmail(opts.to, `Your ${branding.company} referral link is ready`, html)
}
