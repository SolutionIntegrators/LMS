export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { upsertMemberEngagement } from '@/lib/airtable'

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
  return Response.json({ ok: true, members: rows.length, upserted })
}
