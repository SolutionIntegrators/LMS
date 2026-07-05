export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { branding } from '@/lib/branding'

// Affiliate tracking link: /r/<code>
// Logs the click, drops a 60-day attribution cookie on the parent domain
// (readable by both the marketing site and this portal), and redirects to
// the affiliate's destination URL. Unknown/inactive codes still redirect to
// the shop so a stale link never dead-ends a buyer.

const COOKIE_MAX_AGE = 60 * 60 * 24 * 60 // 60 days

function parentDomain(host: string): string | null {
  const h = host.split(':')[0]
  if (h === 'localhost' || /^[\d.]+$/.test(h)) return null
  const parts = h.split('.')
  if (parts.length < 2) return null
  return parts.slice(-2).join('.')
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params
  const code = (rawCode || '').trim().toLowerCase()

  let destination = branding.links.shop

  if (code) {
    const db = createServiceSupabaseClient()
    const { data: link } = await (db as any).from('affiliate_links')
      .select('id, destination_url, is_active')
      .eq('code', code)
      .maybeSingle()

    if (link?.is_active && link.destination_url) {
      destination = link.destination_url
      // Best-effort click log — never block the redirect on it.
      await (db as any).from('affiliate_clicks').insert({
        link_id: link.id,
        referer: request.headers.get('referer'),
        user_agent: request.headers.get('user-agent'),
      })
    }
  }

  const headers = new Headers({ Location: destination })
  const domain = parentDomain(new URL(request.url).host)
  if (code) {
    headers.append(
      'Set-Cookie',
      `aff_ref=${encodeURIComponent(code)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax; Secure${domain ? `; Domain=.${domain}` : ''}`
    )
  }
  return new Response(null, { status: 302, headers })
}
