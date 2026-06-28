import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; event?: string; date?: string }>
}) {
  const { user: userFilter, event: eventFilter, date: dateFilter } = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('activity_logs')
    .select('id, user_id, event_type, product_id, lesson_id, metadata, created_at, profiles(email), products(title)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (eventFilter) query = query.eq('event_type', eventFilter)
  if (dateFilter) query = query.gte('created_at', `${dateFilter}T00:00:00`)

  const { data: logsRaw } = await query
  const logs = logsRaw as any[] | null

  const filtered = userFilter
    ? (logs ?? []).filter((l) => (l.profiles as any)?.email?.toLowerCase().includes(userFilter.toLowerCase()))
    : (logs ?? [])

  const eventTypes = ['login', 'logout', 'lesson_viewed', 'lesson_completed', 'product_accessed', 'purchase', 'download']

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)', marginBottom: '1.75rem' }}>
        Activity Logs
      </h1>

      {/* Filters */}
      <form method="GET" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          name="user"
          defaultValue={userFilter}
          placeholder="Filter by email…"
          style={{ border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.5rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-dark-text)', background: 'var(--si-white)', width: 220 }}
        />
        <select
          name="event"
          defaultValue={eventFilter}
          style={{ border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.5rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-dark-text)', background: 'var(--si-white)' }}
        >
          <option value="">All events</option>
          {eventTypes.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input
          type="date"
          name="date"
          defaultValue={dateFilter}
          style={{ border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.5rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-dark-text)', background: 'var(--si-white)' }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Filter</button>
        {(userFilter || eventFilter || dateFilter) && (
          <a href="/admin/logs" style={{ alignSelf: 'center', color: 'var(--si-muted)', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline' }}>Clear</a>
        )}
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--si-border)' }}>
              {['Time', 'User', 'Event', 'Product', 'Details'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.875rem', color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--si-border)', background: i % 2 === 0 ? 'var(--si-white)' : 'transparent' }}>
                <td style={{ padding: '0.625rem 0.875rem', color: 'var(--si-muted)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '0.625rem 0.875rem', color: 'var(--si-dark-text)' }}>
                  {(log.profiles as any)?.email ?? log.user_id.slice(0, 8) + '…'}
                </td>
                <td style={{ padding: '0.625rem 0.875rem' }}>
                  <EventBadge type={log.event_type} />
                </td>
                <td style={{ padding: '0.625rem 0.875rem', color: 'var(--si-muted)' }}>
                  {(log.products as any)?.title ?? '—'}
                </td>
                <td style={{ padding: '0.625rem 0.875rem', color: 'var(--si-muted)', fontSize: '0.8rem' }}>
                  {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p style={{ textAlign: 'center', color: 'var(--si-muted)', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>No logs found.</p>
        )}
      </div>
    </div>
  )
}

function EventBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    login: { bg: '#EDF7F0', color: '#1A6B3C' },
    lesson_completed: { bg: '#EDF7F0', color: '#1A6B3C' },
    purchase: { bg: '#EDF7F0', color: '#1A6B3C' },
    lesson_viewed: { bg: 'var(--si-linen)', color: 'var(--si-denim-blue)' },
    product_accessed: { bg: 'var(--si-linen)', color: 'var(--si-denim-blue)' },
    logout: { bg: '#FDF0EE', color: '#8B2A1A' },
    download: { bg: '#FFF8EC', color: '#7A5000' },
  }
  const style = colors[type] ?? { bg: 'var(--si-linen)', color: 'var(--si-muted)' }
  return (
    <span style={{ background: style.bg, color: style.color, padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.775rem', fontWeight: 600, letterSpacing: '0.03em' }}>
      {type}
    </span>
  )
}
