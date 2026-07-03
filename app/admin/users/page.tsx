export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { updateUserTags } from '../content/actions'
import { inviteUser, updateUserName, grantProduct, revokeProduct } from './actions'

const inputSm: React.CSSProperties = {
  border: '1px solid var(--si-border)',
  borderRadius: 4,
  padding: '0.25rem 0.5rem',
  fontSize: '0.8rem',
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
}

const btnSm: React.CSSProperties = {
  fontSize: '0.7rem',
  padding: '0.25rem 0.5rem',
  borderRadius: 4,
  border: '1px solid var(--si-border)',
  background: 'var(--si-white)',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--si-dark-text)',
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
}

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, tags, created_at, last_login_at')
    .order('created_at', { ascending: false })
  const profiles = profilesRaw as any[] | null

  const { data: accessRowsRaw } = await supabase
    .from('user_product_access')
    .select('user_id, product_id, granted_at, products(title)')
  const accessRows = accessRowsRaw as any[] | null

  const { data: productsRaw } = await supabase
    .from('products')
    .select('id, title')
    .order('title')
  const products = (productsRaw ?? []) as any[]

  const accessByUser = (accessRows ?? []).reduce<Record<string, Array<{ product_id: string; title: string }>>>((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = []
    acc[row.user_id].push({ product_id: row.product_id, title: (row.products as any)?.title ?? '—' })
    return acc
  }, {})

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)', marginBottom: '1.5rem' }}>
        Users ({profiles?.length ?? 0})
      </h1>

      {/* Add user */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-denim-blue)', marginBottom: '0.25rem' }}>
          Add a user
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-muted)', marginBottom: '1rem' }}>
          Creates their account, emails them a branded invite, and (optionally) grants a program — all in one go.
        </p>
        <form action={inviteUser} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Email *</span>
            <input name="email" type="email" required placeholder="student@example.com" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Name</span>
            <input name="full_name" placeholder="Jane Smith" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Grant program (optional)</span>
            <select name="product_id" defaultValue="" style={inputStyle}>
              <option value="">— None yet —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Add + send invite
          </button>
        </form>
      </div>

      {/* Users table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--si-border)' }}>
              {['Email', 'Name', 'Role', 'Tags', 'Programs', 'Last login', 'Joined'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.875rem', color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p, i) => {
              const owned = accessByUser[p.id] ?? []
              const ownedIds = new Set(owned.map((o) => o.product_id))
              const grantable = products.filter((prod) => !ownedIds.has(prod.id))
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--si-border)', background: i % 2 === 0 ? 'var(--si-white)' : 'transparent', verticalAlign: 'top' }}>
                  <td style={{ padding: '0.75rem 0.875rem', color: 'var(--si-dark-text)', fontWeight: 500 }}>{p.email}</td>

                  {/* Name (inline edit) */}
                  <td style={{ padding: '0.5rem 0.875rem' }}>
                    <form action={updateUserName} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <input type="hidden" name="user_id" value={p.id} />
                      <input name="full_name" defaultValue={p.full_name ?? ''} placeholder="Add name…" style={{ ...inputSm, width: 120 }} />
                      <button type="submit" style={btnSm}>Save</button>
                    </form>
                  </td>

                  <td style={{ padding: '0.75rem 0.875rem' }}>
                    <span style={{ background: p.role === 'admin' ? 'var(--si-denim-blue)' : 'var(--si-linen-dark)', color: p.role === 'admin' ? 'white' : 'var(--si-denim-blue)', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {p.role}
                    </span>
                  </td>

                  {/* Tags (inline edit) */}
                  <td style={{ padding: '0.5rem 0.875rem' }}>
                    <form action={updateUserTags} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <input type="hidden" name="user_id" value={p.id} />
                      <input name="tags" defaultValue={(p.tags ?? []).join(', ')} placeholder="vip, tier2…" style={{ ...inputSm, width: 120 }} />
                      <button type="submit" style={btnSm}>Save</button>
                    </form>
                  </td>

                  {/* Programs: granted chips with revoke + grant dropdown */}
                  <td style={{ padding: '0.5rem 0.875rem', minWidth: 240 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {owned.map((o) => (
                        <div key={o.product_id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span style={{ background: 'var(--si-linen)', borderRadius: 4, padding: '0.2rem 0.5rem', fontSize: '0.78rem', color: 'var(--si-dark-text)' }}>
                            {o.title}
                          </span>
                          <form action={revokeProduct}>
                            <input type="hidden" name="user_id" value={p.id} />
                            <input type="hidden" name="product_id" value={o.product_id} />
                            <button type="submit" title="Revoke access" style={{ ...btnSm, color: '#8B2A1A', borderColor: '#f5c6c0', background: '#FDF0EE', padding: '0.1rem 0.4rem' }}>✕</button>
                          </form>
                        </div>
                      ))}
                      {owned.length === 0 && (
                        <span style={{ color: 'var(--si-muted)', fontSize: '0.8rem' }}>None</span>
                      )}
                      {grantable.length > 0 && (
                        <form action={grantProduct} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          <input type="hidden" name="user_id" value={p.id} />
                          <select name="product_id" required defaultValue="" style={{ ...inputSm, maxWidth: 160 }}>
                            <option value="">+ Grant program…</option>
                            {grantable.map((prod) => <option key={prod.id} value={prod.id}>{prod.title}</option>)}
                          </select>
                          <button type="submit" style={btnSm}>Grant</button>
                        </form>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '0.75rem 0.875rem', color: 'var(--si-muted)', whiteSpace: 'nowrap' }}>
                    {p.last_login_at ? new Date(p.last_login_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', color: 'var(--si-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!profiles?.length && (
          <p style={{ textAlign: 'center', color: 'var(--si-muted)', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>No users yet.</p>
        )}
      </div>
    </div>
  )
}
