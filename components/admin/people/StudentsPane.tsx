'use client'

import { useMemo, useState } from 'react'
import { inviteUser } from '@/app/admin/users/actions'
import UserDetailPanel from './UserDetailPanel'

export interface StudentUser {
  id: string
  email: string
  full_name: string | null
  role: string
  tags: string[]
  avatar_url: string | null
  created_at: string
  last_login_at: string | null
  programs: Array<{ product_id: string; title: string }>
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

const th: React.CSSProperties = { textAlign: 'left', padding: '0.625rem 0.875rem', color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '0.75rem 0.875rem', verticalAlign: 'middle' }

export default function StudentsPane({
  users,
  products,
}: {
  users: StudentUser[]
  products: Array<{ id: string; title: string }>
}) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.email.toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q))
  }, [query, users])

  const selectedUser = selectedId ? users.find((u) => u.id === selectedId) ?? null : null

  return (
    <div style={{ position: 'relative' }}>
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

      {/* Quick find */}
      <div style={{ marginBottom: '1.25rem', maxWidth: 420 }}>
        <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: 'var(--si-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
          Quick find
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          style={inputStyle}
        />
      </div>

      {/* Compact table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--si-border)' }}>
              <th style={th}>Email</th>
              <th style={th}>Name</th>
              <th style={th}>Role</th>
              <th style={th}>Tags</th>
              <th style={th}>Programs</th>
              <th style={th}>Last login</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                style={{ borderBottom: '1px solid var(--si-border)', background: i % 2 === 0 ? 'var(--si-white)' : 'transparent', cursor: 'pointer' }}
              >
                <td style={{ ...td, color: 'var(--si-dark-text)', fontWeight: 500 }}>{u.email}</td>
                <td style={{ ...td, color: 'var(--si-muted)' }}>{u.full_name || '—'}</td>
                <td style={td}>
                  <span style={{ background: u.role === 'admin' ? 'var(--si-denim-blue)' : 'var(--si-linen-dark)', color: u.role === 'admin' ? 'white' : 'var(--si-denim-blue)', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ ...td, color: 'var(--si-muted)', fontSize: '0.85rem' }}>{u.tags.length ? u.tags.join(', ') : '—'}</td>
                <td style={td}>
                  {u.programs.length
                    ? <span><b style={{ color: 'var(--si-denim-blue)' }}>{u.programs.length}</b> program{u.programs.length === 1 ? '' : 's'}</span>
                    : <span style={{ color: 'var(--si-muted)' }}>None</span>}
                </td>
                <td style={{ ...td, color: 'var(--si-muted)', whiteSpace: 'nowrap' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <span style={{ color: 'var(--si-burnt-orange)', fontWeight: 600, fontSize: '0.82rem' }}>View →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p style={{ textAlign: 'center', color: 'var(--si-muted)', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
            {users.length ? 'No users match.' : 'No users yet.'}
          </p>
        )}
      </div>

      {selectedUser && (
        <UserDetailPanel user={selectedUser} products={products} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
