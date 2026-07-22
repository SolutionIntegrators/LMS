export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { createAffiliate, deleteAffiliate, createAffiliateLink, toggleLink, deleteLink } from './actions'
import CopyLinkButton from './CopyLinkButton'

const cell: React.CSSProperties = { padding: '0.5rem 0.75rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }
const th: React.CSSProperties = { ...cell, color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '2px solid var(--si-border)', textAlign: 'left' as const }
const btnSm: React.CSSProperties = { fontSize: '0.7rem', padding: '0.28rem 0.55rem', borderRadius: 4, border: '1px solid var(--si-border)', background: 'var(--si-white)', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif', color: 'var(--si-dark-text)' }
const inputStyle: React.CSSProperties = { border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.5rem 0.7rem', fontSize: '0.85rem', color: 'var(--si-dark-text)', background: 'var(--si-white)', width: '100%', fontFamily: 'DM Sans, sans-serif' }
const lbl: React.CSSProperties = { fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', fontWeight: 500, color: 'var(--si-muted)' }
const inputSm: React.CSSProperties = { ...inputStyle, padding: '0.35rem 0.55rem', fontSize: '0.8rem' }

export default async function AdminAffiliatesPage() {
  const supabase = await createServerSupabaseClient()
  const base = `https://${(await headers()).get('host') ?? 'goodies.solutionintegrators.us'}`

  const [{ data: affRaw }, { data: linkRaw }, { data: prodRaw }, { data: clickRaw }, { data: attrRaw }] = await Promise.all([
    (supabase as any).from('affiliates').select('id, name, email, commission_rate, created_at').order('created_at', { ascending: false }),
    (supabase as any).from('affiliate_links').select('id, affiliate_id, product_id, code, destination_url, is_active'),
    (supabase as any).from('products').select('id, title').order('title'),
    (supabase as any).from('affiliate_clicks').select('link_id'),
    (supabase as any).from('referral_attributions').select('affiliate_id, converted_at, sale_amount, commission_amount'),
  ])
  const affiliates = (affRaw ?? []) as any[]
  const links = (linkRaw ?? []) as any[]
  const products = (prodRaw ?? []) as any[]
  const productName = new Map(products.map((p) => [p.id, p.title]))

  const clicksByLink = new Map<string, number>()
  for (const c of (clickRaw ?? []) as any[]) clicksByLink.set(c.link_id, (clicksByLink.get(c.link_id) ?? 0) + 1)

  // Per-affiliate referral summary (converted attributions only).
  const summary = new Map<string, { sales: number; commission: number }>()
  for (const a of (attrRaw ?? []) as any[]) {
    if (!a.converted_at) continue
    const s = summary.get(a.affiliate_id) ?? { sales: 0, commission: 0 }
    s.sales += 1
    s.commission += Number(a.commission_amount ?? 0)
    summary.set(a.affiliate_id, s)
  }

  const linksByAffiliate = new Map<string, any[]>()
  for (const l of links) {
    const arr = linksByAffiliate.get(l.affiliate_id) ?? []
    arr.push(l)
    linksByAffiliate.set(l.affiliate_id, arr)
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)' }}>
          Affiliates ({affiliates.length})
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', marginTop: '0.375rem', maxWidth: '60ch' }}>
          Each affiliate can have a tracking link per product ({base}/r/<em>code</em>). Sales are attributed
          automatically when a referred buyer purchases the linked product and signs in — commission is
          calculated from the affiliate&apos;s rate and logged to your Backoffice payout hub.
        </p>
      </div>

      {/* Add affiliate (person) */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.95rem', color: 'var(--si-denim-blue)', marginBottom: '0.875rem' }}>Add Affiliate</h2>
        <form action={createAffiliate} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 0.8fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span style={lbl}>Name *</span><input name="name" required placeholder="e.g. RP Digital Studio" style={inputStyle} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span style={lbl}>Email (for their link + payout match)</span><input name="email" type="email" placeholder="partner@example.com" style={inputStyle} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span style={lbl}>Commission %</span><input name="commission_rate" type="number" min="0" max="100" step="1" placeholder="20" style={inputStyle} /></label>
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
        </form>
      </div>

      {affiliates.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          No affiliates yet. Add one above, then give them a link per product.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {affiliates.map((a) => {
          const myLinks = linksByAffiliate.get(a.id) ?? []
          const sum = summary.get(a.id) ?? { sales: 0, commission: 0 }
          return (
            <div key={a.id} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              {/* Affiliate header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--si-dark-text)' }}>{a.name}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-muted)' }}>
                    {a.email || 'no email'} · {a.commission_rate ?? 0}% commission
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right', fontFamily: 'DM Sans, sans-serif' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--si-denim-blue)' }}>${sum.commission.toFixed(2)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--si-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sum.sales} referred sale{sum.sales === 1 ? '' : 's'}</div>
                  </div>
                  <form action={deleteAffiliate}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" style={{ ...btnSm, color: '#8B2A1A' }}>Delete</button>
                  </form>
                </div>
              </div>

              {/* Links */}
              {myLinks.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem' }}>
                  <thead><tr><th style={th}>Product</th><th style={th}>Link</th><th style={{ ...th, textAlign: 'right' }}>Clicks</th><th style={th}>Status</th><th style={th}></th></tr></thead>
                  <tbody>
                    {myLinks.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--si-border)' }}>
                        <td style={cell}>{l.product_id ? (productName.get(l.product_id) ?? '—') : <span style={{ color: 'var(--si-muted)' }}>No product (clicks only)</span>}</td>
                        <td style={cell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <code style={{ background: 'var(--si-linen)', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.75rem' }}>/r/{l.code}</code>
                            <CopyLinkButton url={`${base}/r/${l.code}`} />
                          </div>
                        </td>
                        <td style={{ ...cell, textAlign: 'right', fontWeight: 600, color: 'var(--si-denim-blue)' }}>{clicksByLink.get(l.id) ?? 0}</td>
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
          )
        })}
      </div>
    </div>
  )
}
