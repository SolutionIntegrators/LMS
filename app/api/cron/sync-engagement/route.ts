export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { upsertMemberEngagement } from '@/lib/airtable'
import { tagSubscriber, removeTagFromSubscriber } from '@/lib/kit'

// Kit tag that drives the "haven't logged in" nurture sequence. Applied once
// per person (deduped by email) — never per product — so multi-product buyers
// only ever enter the sequence once.
const LOGIN_NUDGE_TAG_ID = process.env.KIT_LOGIN_NUDGE_TAG_ID || '21369198'
const NUDGE_AFTER_DAYS = 5

// Daily engagement sync → the hub's "Member Engagement" table. Reads the
// member_engagement view (per member+product: grant, first login, activity,
// lessons done/total) and upserts a row each. Derives days-to-login, % complete,
// and a status. Schedule (like the other crons):
//   GET /api/cron/sync-engagement?key=CRON_SECRET
export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = createServiceSupabaseClient() as any
  const { data, error } = await db.from('member_engagement').select('*')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const today = new Date().toISOString().slice(0, 10)
  const day = 24 * 60 * 60 * 1000
  const rows = (data ?? []).map((r: any) => {
    const total = Number(r.total_lessons || 0)
    const done = Number(r.lessons_completed || 0)
    const loggedIn = !!r.first_login_at
    let status: string
    if (!loggedIn) status = 'Never Logged In'
    else if (total > 0 && done >= total) status = 'Completed'
    else if (done > 0) status = 'In Progress'
    else status = 'Not Started'

    let daysToLogin: number | null = null
    if (r.granted_at && r.first_login_at) {
      daysToLogin = Math.round(((new Date(r.first_login_at).getTime() - new Date(r.granted_at).getTime()) / day) * 10) / 10
      if (daysToLogin < 0) daysToLogin = 0
    }

    return {
      'Member + Product': `${(r.email || '').toLowerCase()}::${r.product_slug || ''}`,
      Email: r.email || '',
      Name: r.name || '',
      Product: r.product || '',
      'Granted At': r.granted_at ? r.granted_at.slice(0, 10) : null,
      'First Login At': r.first_login_at ? r.first_login_at.slice(0, 10) : null,
      'Days to Login': daysToLogin,
      'Last Active At': r.last_active_at ? r.last_active_at.slice(0, 10) : null,
      'Lessons Completed': done,
      'Total Lessons': total,
      '% Complete': total > 0 ? Math.round((done / total) * 100) : null,
      Status: status,
      'Last Synced': today,
    }
  })

  const { upserted } = await upsertMemberEngagement(rows)

  // Kit login-nudge, deduped by email (one action per person, not per product):
  //   • never logged in AND earliest grant > 5 days ago  → add the nudge tag
  //   • has logged in                                     → remove it (exit nurture)
  const now = Date.now()
  const byEmail = new Map<string, { everLoggedIn: boolean; earliestGrant: number }>()
  for (const r of (data ?? []) as any[]) {
    const email = (r.email || '').toLowerCase().trim()
    if (!email) continue
    const grant = r.granted_at ? new Date(r.granted_at).getTime() : now
    const cur = byEmail.get(email)
    if (!cur) byEmail.set(email, { everLoggedIn: !!r.first_login_at, earliestGrant: grant })
    else {
      cur.everLoggedIn = cur.everLoggedIn || !!r.first_login_at
      cur.earliestGrant = Math.min(cur.earliestGrant, grant)
    }
  }
  // Gate: only touch Kit once the nurture sequence is live (set
  // KIT_LOGIN_NUDGE_ENABLED=true). Until then we just report who WOULD be nudged.
  const enabled = process.env.KIT_LOGIN_NUDGE_ENABLED === 'true'
  let tagged = 0, untagged = 0
  for (const [email, m] of byEmail) {
    if (m.everLoggedIn) {
      if (enabled) await removeTagFromSubscriber(LOGIN_NUDGE_TAG_ID, email)
      untagged++
    } else if ((now - m.earliestGrant) / (24 * 60 * 60 * 1000) >= NUDGE_AFTER_DAYS) {
      if (enabled) await tagSubscriber(LOGIN_NUDGE_TAG_ID, email)
      tagged++
    }
  }

  return Response.json({
    ok: true, members: rows.length, upserted, people: byEmail.size,
    nudge_enabled: enabled,
    login_nudge_tagged: enabled ? tagged : 0,
    nudge_cleared: enabled ? untagged : 0,
    would_nudge: tagged, would_clear: untagged,
  })
}
