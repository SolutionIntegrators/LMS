'use client'

import { useMemo, useState } from 'react'
import { createAffiliate, deleteAffiliate, updateAffiliateCommission, createAffiliateLink, toggleLink, deleteLink } from '@/app/admin/affiliates/actions'
import CopyLinkButton from '@/app/admin/affiliates/CopyLinkButton'

export interface LmsUser {
  id: string
  email: string
  full_name: string | null
}

export interface AffiliateWithLinks {
  id: string
  name: string
  email: string | null
  commission_rate: number | null
  sales: number
  commissionEarned: number
  links: Array<{
    id: string
    code: string
    is_active: boolean
    productTitle: string | null
    clicks: number
    url: string
  }>
}

const cell: React.CSSProperties = { padding: '0.5rem 0.75rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }
const th: React.CSSProperties = { ...cell, color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--si-border)', textAlign: 'left' }
const btnSm: React.CSSProperties = { fontSize: '0.7rem', padding: '0.28rem 0.55rem', borderRadius: 4, border: '1px solid var(--si-border)', background: 'var(--si-white)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-dark-text)' }
const inputStyle: React.CSSProperties = { border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.5rem 0.7rem', fontSize: '0.85rem', color: 'var(--si-dark-text)', background: 'var(--si-white)', width: '100%', fontFamily: 'DM Sans, sans-serif' }
const lbl: React.CSSProperties = { fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', fontWeight: 500, color: 'var(--si-muted)' }
const inputSm: React.CSSProperties = { ...inputStyle, padding: '0.35rem 0.55rem', fontSize: '0.8rem' }

function userLabel(u: LmsUser): string {
  return u.full_name ? `${u.full_name} — ${u.email}` : u.email
}

export default function AffiliatesPane({
  affiliates,
  products,
  users,
}: {
  affiliates: AffiliateWithLinks[]
  products: Array<{ id: string; title: string }>
  users: LmsUser[]
}) {
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Matches an existing LMS user by their exact "Name — email" datalist label,
  // so picking one auto-fills both fields instead of the admin retyping them.
  const userByLabel = useMemo(() => {
    const map = new Map<string, LmsUser>()
    for (const u of users) map.set(userLabel(u), u)
    return map
  }, [users])

  function handleNameInput(value: string) {
    const matched = userByLabel.get(value)
    if (matched) {
      setName(matched.full_name || matched.email)
      setEmail(matched.email)
    } else {
      setName(value)
    }
  }

  async function handleAddAffiliate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('name', name)
      fd.set('email', email)
      await createAffiliate(fd)
      setName('')
      setEmail('')
      e.currentTarget.reset()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add affiliate')
    } finally {
      setAdding(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return affiliates
    return affiliates.filter((a) => a.name.toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q))
  }, [query, affiliates])

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', maxWidth: '60ch', margin: 0 }}>
          Each affiliate can have a tracking link per product (/r/<em>code</em>). Sales are attributed
          automatically when a referred buyer purchases the linked product and signs in — commission is
          calculated from the affiliate&apos;s rate and logged to your Backoffice payout hub.
        </p>
      </div>

      {/* Add affiliate */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.95rem', color: 'var(--si-denim-blue)', marginBottom: '0.875rem' }}>Add Affiliate</h2>
        {addError && <p style={{ color: '#8B2A1A', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{addError}</p>}
        <datalist id="affiliate-user-options">
          {users.map((u) => <option key={u.id} value={userLabel(u)} />)}
        </datalist>
        <form onSubmit={handleAddAffiliate} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 0.8fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={lbl}>Name *</span>
            <input
              name="name"
              list="affiliate-user-options"
              value={name}
              onChange={(e) => handleNameInput(e.target.value)}
              required
              placeholder="Type a name, or pick an existing user"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={lbl}>Email (for their link + payout match)</span>
            <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@example.com" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span style={lbl}>Commission %</span><input name="commission_rate" type="number" min="0" max="100" step="1" placeholder="20" style={inputStyle} /></label>
          <button type="submit" className="btn-primary" disabled={adding} style={{ whiteSpace: 'nowrap' }}>{adding ? 'Adding…' : 'Add'}</button>
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

      {affiliates.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          No affiliates yet. Add one above, then give them a link per product.
        </div>
      )}
      {affiliates.length > 0 && filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--si-muted)', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>No affiliates match.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filtered.map((a) => (
          <div key={a.id} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            {/* Affiliate header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--si-dark-text)' }}>{a.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-muted)' }}>
                  <span>{a.email || 'no email'} ·</span>
                  <form action={updateAffiliateCommission} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      name="commission_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue={a.commission_rate ?? 0}
                      style={{ width: 52, border: '1px solid var(--si-border)', borderRadius: 4, padding: '0.15rem 0.35rem', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-dark-text)', background: 'var(--si-white)' }}
                    />
                    <span>% commission</span>
                    <button type="submit" style={{ ...btnSm, padding: '0.15rem 0.4rem', fontSize: '0.68rem' }}>Save</button>
                  </form>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right', fontFamily: 'DM Sans, sans-serif' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--si-denim-blue)' }}>${a.commissionEarned.toFixed(2)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--si-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{a.sales} referred sale{a.sales === 1 ? '' : 's'}</div>
                </div>
                <form action={deleteAffiliate}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" style={{ ...btnSm, color: '#8B2A1A' }}>Delete</button>
                </form>
              </div>
            </div>

            {/* Links */}
            {a.links.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem' }}>
                <thead><tr><th style={th}>Product</th><th style={th}>Link</th><th style={{ ...th, textAlign: 'right' }}>Clicks</th><th style={th}>Status</th><th style={th}></th></tr></thead>
                <tbody>
                  {a.links.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--si-border)' }}>
                      <td style={cell}>{l.productTitle ?? <span style={{ color: 'var(--si-muted)' }}>No product (clicks only)</span>}</td>
                      <td style={cell}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <code style={{ background: 'var(--si-linen)', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.75rem' }}>/r/{l.code}</code>
                          <CopyLinkButton url={l.url} />
                        </div>
                      </td>
                      <td style={{ ...cell, textAlign: 'right', fontWeight: 600, color: 'var(--si-denim-blue)' }}>{l.clicks}</td>
                      <td style={cell}><span style={{ background: l.is_active ? '#EDF7F0' : 'var(--si-linen)', color: l.is_active ? '#1A6B3C' : 'var(--si-muted)', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600 }}>{l.is_active ? 'Active' : 'Paused'}</span></td>
                      <td style={{ ...cell, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                          <form action={toggleLink}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="is_active" value={(!l.is_active).toString()} /><button type="submit" style={btnSm}>{l.is_active ? 'Pause' : 'Activate'}</button></form>
                          <form action={deleteLink}><input type="hidden" name="id" value={l.id} /><button type="submit" style={{ ...btnSm, color: '#8B2A1A' }}>✕</button></form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add link */}
            <form action={createAffiliateLink} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 1fr auto', gap: '0.5rem', alignItems: 'end', background: 'var(--si-linen)', padding: '0.75rem', borderRadius: 8 }}>
              <input type="hidden" name="affiliate_id" value={a.id} />
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}><span style={lbl}>Product to promote</span>
                <select name="product_id" style={inputSm}>
                  <option value="">— none (clicks only) —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}><span style={lbl}>Destination URL</span><input name="destination_url" placeholder="blank = the product's sales page" style={inputSm} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}><span style={lbl}>Code (optional)</span><input name="code" placeholder="auto" style={inputSm} /></label>
              <button type="submit" style={{ ...btnSm, background: 'var(--si-denim-blue)', color: 'white', borderColor: 'var(--si-denim-blue)', padding: '0.4rem 0.8rem' }}>+ Add link</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
