'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateUserName, updateUserRole, grantProduct, revokeProduct, deleteUser } from '@/app/admin/users/actions'
import { updateUserTags } from '@/app/admin/content/actions'
import type { StudentUser } from './StudentsPane'

const fieldInput: React.CSSProperties = {
  flex: 1, minWidth: 0, border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.5rem 0.7rem',
  fontSize: '0.86rem', color: 'var(--si-dark-text)', background: 'var(--si-white)', fontFamily: 'DM Sans, sans-serif',
}
const btnSave: React.CSSProperties = {
  border: '1px solid var(--si-border)', background: 'var(--si-white)', borderRadius: 6, padding: '0.5rem 0.8rem',
  fontSize: '0.78rem', fontWeight: 600, color: 'var(--si-dark-text)', cursor: 'pointer', whiteSpace: 'nowrap',
  fontFamily: 'DM Sans, sans-serif',
}
const fieldLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--si-muted)',
  marginBottom: '0.5rem', display: 'block', fontFamily: 'DM Sans, sans-serif',
}

export default function UserDetailPanel({
  user,
  products,
  onClose,
}: {
  user: StudentUser
  products: Array<{ id: string; title: string }>
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(user.full_name ?? '')
  const [tags, setTags] = useState(user.tags.join(', '))
  const [grantId, setGrantId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Reset local edit state whenever a different user is opened.
  useEffect(() => {
    setName(user.full_name ?? '')
    setTags(user.tags.join(', '))
    setGrantId('')
    setError(null)
  }, [user.id])

  // Esc to close + lock body scroll while open, matching WelcomeBanner's lightbox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  function saveName() {
    run(async () => {
      const fd = new FormData()
      fd.set('user_id', user.id)
      fd.set('full_name', name)
      await updateUserName(fd)
    })
  }

  function setRole(role: 'user' | 'admin') {
    run(async () => {
      const fd = new FormData()
      fd.set('user_id', user.id)
      fd.set('role', role)
      await updateUserRole(fd)
    })
  }

  function saveTags() {
    run(async () => {
      const fd = new FormData()
      fd.set('user_id', user.id)
      fd.set('tags', tags)
      await updateUserTags(fd)
    })
  }

  function grant() {
    if (!grantId) return
    run(async () => {
      const fd = new FormData()
      fd.set('user_id', user.id)
      fd.set('product_id', grantId)
      await grantProduct(fd)
      setGrantId('')
    })
  }

  function revoke(productId: string) {
    run(async () => {
      const fd = new FormData()
      fd.set('user_id', user.id)
      fd.set('product_id', productId)
      await revokeProduct(fd)
    })
  }

  function remove() {
    if (!confirm(`Remove ${user.email}? This deletes their account and all access. This cannot be undone.`)) return
    run(async () => {
      const fd = new FormData()
      fd.set('user_id', user.id)
      await deleteUser(fd)
      onClose()
    })
  }

  const ownedIds = new Set(user.programs.map((p) => p.product_id))
  const grantable = products.filter((p) => !ownedIds.has(p.id))

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(30,40,48,0.32)', zIndex: 200 }}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 92vw)',
          background: 'var(--si-white)', boxShadow: '-8px 0 40px rgba(30,40,48,0.18)',
          zIndex: 201, display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', padding: '1.25rem 1.35rem 1.1rem', borderBottom: '1px solid var(--si-border)' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--si-denim-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>{(user.full_name || user.email)[0]?.toUpperCase()}</span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '1.05rem', fontWeight: 600, color: 'var(--si-dark-text)', margin: '0 0 0.15rem' }}>
              {user.full_name || user.email}
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: 'var(--si-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'var(--si-linen)', border: 'none', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: '0.95rem', color: 'var(--si-muted)', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.35rem 2rem', overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
          {error && (
            <div style={{ background: '#FDF0EE', color: '#8B2A1A', borderRadius: 'var(--si-radius-sm)', padding: '0.625rem 0.875rem', fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '1.1rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.4rem' }}>
            <span style={fieldLabel}>Name</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input value={name} onChange={(e) => setName(e.target.value)} style={fieldInput} />
              <button onClick={saveName} disabled={busy} style={btnSave}>Save</button>
            </div>
          </div>

          <div style={{ marginBottom: '1.4rem' }}>
            <span style={fieldLabel}>Role</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setRole('user')}
                disabled={busy}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: 'var(--si-radius-sm)', cursor: 'pointer', textAlign: 'center',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', fontWeight: 600,
                  border: `1.5px solid ${user.role === 'user' ? 'var(--si-denim-blue)' : 'var(--si-border)'}`,
                  background: user.role === 'user' ? 'var(--si-linen-dark)' : 'var(--si-white)',
                  color: user.role === 'user' ? 'var(--si-denim-blue)' : 'var(--si-muted)',
                }}
              >
                User
              </button>
              <button
                onClick={() => setRole('admin')}
                disabled={busy}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: 'var(--si-radius-sm)', cursor: 'pointer', textAlign: 'center',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', fontWeight: 600,
                  border: `1.5px solid var(--si-denim-blue)`,
                  background: user.role === 'admin' ? 'var(--si-denim-blue)' : 'var(--si-white)',
                  color: user.role === 'admin' ? 'white' : 'var(--si-muted)',
                }}
              >
                Admin
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.4rem' }}>
            <span style={fieldLabel}>Tags</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, tier2…" style={fieldInput} />
              <button onClick={saveTags} disabled={busy} style={btnSave}>Save</button>
            </div>
          </div>

          <div style={{ marginBottom: '1.4rem' }}>
            <span style={fieldLabel}>Programs</span>
            {user.programs.length === 0 && (
              <p style={{ color: 'var(--si-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem', fontFamily: 'DM Sans, sans-serif' }}>No programs granted yet.</p>
            )}
            {user.programs.map((p) => (
              <div key={p.product_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: '0.55rem 0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--si-dark-text)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                <button
                  onClick={() => revoke(p.product_id)}
                  disabled={busy}
                  title="Revoke access"
                  style={{ background: '#FDF0EE', color: '#8B2A1A', border: 'none', borderRadius: 5, width: 24, height: 24, cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
            {grantable.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <select value={grantId} onChange={(e) => setGrantId(e.target.value)} style={{ ...fieldInput, flex: 1 }}>
                  <option value="">+ Grant program…</option>
                  {grantable.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <button onClick={grant} disabled={busy || !grantId} style={btnSave}>Grant</button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.4rem' }}>
            <span style={fieldLabel}>Account</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.4rem 0', borderBottom: '1px solid var(--si-border)', fontFamily: 'DM Sans, sans-serif' }}>
              <span style={{ color: 'var(--si-muted)' }}>Last login</span>
              <span style={{ color: 'var(--si-dark-text)' }}>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '— (never logged in)'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.4rem 0', fontFamily: 'DM Sans, sans-serif' }}>
              <span style={{ color: 'var(--si-muted)' }}>Joined</span>
              <span style={{ color: 'var(--si-dark-text)' }}>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <button
            onClick={remove}
            disabled={busy}
            style={{
              marginTop: '0.5rem', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#8B2A1A',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '0.6rem 0', borderTop: '1px solid var(--si-border)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Remove user…
          </button>
        </div>
      </div>
    </>
  )
}
