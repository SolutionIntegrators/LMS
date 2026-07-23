export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function AdminSupportPage() {
  const supabase = await createServerSupabaseClient()

  // Admins get the full picture — internal_status included (RLS's
  // support_requests_admin_all policy grants full access via is_admin()).
  const { data } = await (supabase as any)
    .from('support_requests')
    .select('id, subject, description, product_slug, internal_status, client_visible_status, resolution, additional_info_needed, clickup_task_id, created_at, updated_at, user_id')
    .order('created_at', { ascending: false })
    .limit(200)

  const requests = (data ?? []) as any[]

  // support_requests.user_id references auth.users, not public.profiles, so
  // PostgREST can't embed profiles(...) directly (same reason as community
  // threads/replies) — resolve display names via a separate lookup instead.
  const userIds = [...new Set(requests.map((r) => r.user_id).filter(Boolean))]
  const profilesById = new Map<string, { email: string; full_name: string | null }>()
  if (userIds.length > 0) {
    const { data: profileRows } = await (supabase as any).from('profiles').select('id, email, full_name').in('id', userIds)
    for (const p of profileRows ?? []) profilesById.set(p.id, { email: p.email, full_name: p.full_name })
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)', marginBottom: '1.75rem' }}>
        Support Requests
      </h1>

      {requests.length === 0 ? (
        <p style={{ color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>No support requests yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--si-border)' }}>
                <th style={{ padding: '0.625rem' }}>Subject</th>
                <th style={{ padding: '0.625rem' }}>Student</th>
                <th style={{ padding: '0.625rem' }}>Course</th>
                <th style={{ padding: '0.625rem' }}>Internal status</th>
                <th style={{ padding: '0.625rem' }}>Client sees</th>
                <th style={{ padding: '0.625rem' }}>Additional info needed</th>
                <th style={{ padding: '0.625rem' }}>ClickUp</th>
                <th style={{ padding: '0.625rem' }}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--si-border)' }}>
                  <td style={{ padding: '0.625rem', maxWidth: 260 }}>
                    <div style={{ fontWeight: 600, color: 'var(--si-dark-text)' }}>{r.subject}</div>
                    <div style={{ color: 'var(--si-muted)', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>
                  </td>
                  <td style={{ padding: '0.625rem', color: 'var(--si-muted)' }}>{profilesById.get(r.user_id)?.full_name || profilesById.get(r.user_id)?.email || '—'}</td>
                  <td style={{ padding: '0.625rem', color: 'var(--si-muted)' }}>{r.product_slug || '—'}</td>
                  <td style={{ padding: '0.625rem', color: 'var(--si-muted)', textTransform: 'capitalize' }}>{r.internal_status || '—'}</td>
                  <td style={{ padding: '0.625rem', color: 'var(--si-muted)', textTransform: 'capitalize' }}>{r.client_visible_status || '—'}</td>
                  <td style={{ padding: '0.625rem', color: r.additional_info_needed ? '#B4500F' : 'var(--si-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.additional_info_needed || '—'}</td>
                  <td style={{ padding: '0.625rem' }}>
                    {r.clickup_task_id
                      ? <a href={`https://app.clickup.com/t/${r.clickup_task_id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--si-burnt-orange)' }}>Open ↗</a>
                      : <span style={{ color: '#8B2A1A' }}>Not synced</span>}
                  </td>
                  <td style={{ padding: '0.625rem', color: 'var(--si-muted)', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
