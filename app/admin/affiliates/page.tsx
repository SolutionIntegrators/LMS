export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { createAffiliate, toggleAffiliate, deleteAffiliate } from './actions'
import CopyLinkButton from './CopyLinkButton'

const cell: React.CSSProperties = { padding: '0.625rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }
const th: React.CSSProperties = { ...cell, color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '2px solid var(--si-border)', textAlign: 'left' as const }
const btnSm: React.CSSProperties = {
  fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid var(--si-border)',
  background: 'var(--si-white)', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif', color: 'var(--si-dark-text)',
}
const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.625rem 0.875rem',
  fontSize: '0.9rem', color: 'var(--si-dark-text)', background: 'var(--si-white)', width: '100%', fontFamily: 'DM Sans, sans-serif',
}
const label: React.CSSProperties = { fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }

export default async function AdminAffiliatesPage() {
  const supabase = await createServerSupabaseClient()
  const host = (await headers()).get('host') ?? 'goodies.solutionintegrators.us'
  const base = `https://${host}`

  const { data: affiliatesRaw } = await (supabase as any).from('affiliates')
    .select('id, code, name, email, destination_url, is_active, created_at')
    .order('created_at', { ascending: false })
  const affiliates = (affiliatesRaw ?? []) as any[]

  const { data: clicksRaw } = await (supabase as any).from('affiliate_clicks').select('affiliate_id')
  const clickCounts = new Map<string, number>()
  for (const c of (clicksRaw ?? []) as any[]) {
    clickCounts.set(c.affiliate_id, (clickCounts.get(c.affiliate_id) ?? 0) + 1)
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)' }}>
          Affiliates ({affiliates.length})
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', marginTop: '0.375rem' }}>
          Each affiliate gets a tracking link ({base}/r/<em>code</em>) that counts the click and sends
          the visitor to the destination URL — e.g. your product sales page.
        </p>
      </div>

      {/* Add affiliate */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-denim-blue)', marginBottom: '1rem' }}>
          Add Affiliate
        </h2>
        <form action={createAffiliate} style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr 1.4fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={label}>Name *</span>
            <input name="name" required placeholder="e.g. RP Digital Studio" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={label}>Code</span>
            <input name="code" placeholder="auto from name" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={label}>Email</span>
            <input name="email" type="email" placeholder="optional" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={label}>Destination URL *</span>
            <input name="destination_url" required placeholder="https://solutionintegrators.us/shop/…" style={inputStyle} />
          </label>
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
        </form>
      </div>

      {affiliates.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          No affiliates yet. Add one above — their tracking link appears here.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Affiliate</th>
                <th style={th}>Tracking link</th>
                <th style={th}>Sends to</th>
                <th style={{ ...th, textAlign: 'right' }}>Clicks</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a, i) => {
                const link = `${base}/r/${a.code}`
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--si-border)', background: i % 2 === 0 ? 'var(--si-white)' : 'transparent' }}>
                    <td style={{ ...cell, fontWeight: 500, color: 'var(--si-dark-text)' }}>
                      {a.name}
                      {a.email && <div style={{ fontSize: '0.75rem', color: 'var(--si-muted)', fontWeight: 400 }}>{a.email}</div>}
                    </td>
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ background: 'var(--si-linen)', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.78rem' }}>/r/{a.code}</code>
                        <CopyLinkButton url={link} />
                      </div>
                    </td>
                    <td style={{ ...cell, color: 'var(--si-muted)', fontSize: '0.8rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.destination_url}>
                      {a.destination_url}
                    </td>
                    <td style={{ ...cell, textAlign: 'right', fontWeight: 600, color: 'var(--si-denim-blue)' }}>
                      {clickCounts.get(a.id) ?? 0}
                    </td>
                    <td style={cell}>
                      <span style={{ background: a.is_active ? '#EDF7F0' : 'var(--si-linen)', color: a.is_active ? '#1A6B3C' : 'var(--si-muted)', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                        {a.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td style={{ ...cell, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                        <form action={toggleAffiliate}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="is_active" value={(!a.is_active).toString()} />
                          <button type="submit" style={btnSm}>{a.is_active ? 'Pause' : 'Activate'}</button>
                        </form>
                        <form action={deleteAffiliate}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" style={{ ...btnSm, color: '#8B2A1A' }}>Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
