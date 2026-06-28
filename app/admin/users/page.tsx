
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, last_login_at')
    .order('created_at', { ascending: false })
  const profiles = profilesRaw as any[] | null

  const { data: accessRowsRaw } = await supabase
    .from('user_product_access')
    .select('user_id, granted_at, products(title)')
  const accessRows = accessRowsRaw as any[] | null

  const accessByUser = (accessRows ?? []).reduce<Record<string, Array<{ title: string; granted_at: string }>>>((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = []
    acc[row.user_id].push({ title: (row.products as any)?.title ?? '—', granted_at: row.granted_at })
    return acc
  }, {})

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)', marginBottom: '1.75rem' }}>
        Users ({profiles?.length ?? 0})
      </h1>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--si-border)' }}>
              {['Email', 'Name', 'Role', 'Programs', 'Last login', 'Joined'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.875rem', color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--si-border)', background: i % 2 === 0 ? 'var(--si-white)' : 'transparent' }}>
                <td style={{ padding: '0.75rem 0.875rem', color: 'var(--si-dark-text)', fontWeight: 500 }}>{p.email}</td>
                <td style={{ padding: '0.75rem 0.875rem', color: 'var(--si-muted)' }}>{p.full_name ?? '—'}</td>
                <td style={{ padding: '0.75rem 0.875rem' }}>
                  <span style={{ background: p.role === 'admin' ? 'var(--si-denim-blue)' : 'var(--si-linen-dark)', color: p.role === 'admin' ? 'white' : 'var(--si-denim-blue)', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {p.role}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.875rem', color: 'var(--si-dark-text)' }}>
                  {accessByUser[p.id]?.map((a) => a.title).join(', ') || <span style={{ color: 'var(--si-muted)' }}>None</span>}
                </td>
                <td style={{ padding: '0.75rem 0.875rem', color: 'var(--si-muted)', whiteSpace: 'nowrap' }}>
                  {p.last_login_at ? new Date(p.last_login_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '0.75rem 0.875rem', color: 'var(--si-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!profiles?.length && (
          <p style={{ textAlign: 'center', color: 'var(--si-muted)', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>No users yet.</p>
        )}
      </div>
    </div>
  )
}
