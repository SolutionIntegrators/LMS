'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { setProductCategory, duplicateProduct } from '@/app/admin/content/actions'

export interface ContentProduct {
  id: string
  title: string
  slug: string
  is_active: boolean
  category: string | null
}

const cell: React.CSSProperties = { padding: '0.625rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }
const th: React.CSSProperties = { ...cell, color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '2px solid var(--si-border)', textAlign: 'left' as const }
const inputSm: React.CSSProperties = {
  border: '1px solid var(--si-border)', borderRadius: 4, padding: '0.3rem 0.5rem',
  fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-dark-text)', background: 'var(--si-white)',
}
const btnSm: React.CSSProperties = {
  fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid var(--si-border)',
  background: 'var(--si-white)', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif', color: 'var(--si-dark-text)',
}
const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.625rem 0.875rem',
  fontSize: '0.9rem', color: 'var(--si-dark-text)', background: 'var(--si-white)', width: '100%', fontFamily: 'DM Sans, sans-serif',
}

const UNCATEGORIZED = 'Uncategorized'

export default function ContentTable({ products }: { products: ContentProduct[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.title.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
  }, [query, products])

  const orderedGroups = useMemo(() => {
    const groups = new Map<string, ContentProduct[]>()
    for (const p of filtered) {
      const key = (p.category || '').trim() || UNCATEGORIZED
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }
    const entries = [...groups.entries()]
    entries.sort((a, b) => {
      if (a[0] === UNCATEGORIZED) return 1
      if (b[0] === UNCATEGORIZED) return -1
      return a[0].localeCompare(b[0])
    })
    return entries
  }, [filtered])

  return (
    <div>
      {/* Quick find */}
      <div style={{ marginBottom: '1.5rem', maxWidth: 420 }}>
        <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: 'var(--si-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
          Quick find
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or category…"
          style={inputStyle}
        />
      </div>

      {products.length > 0 && filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--si-muted)', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>No products match.</p>
      )}

      {/* Grouped product tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {orderedGroups.map(([groupName, list]) => (
          <div key={groupName}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--si-denim-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {groupName}
              </h2>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-muted)' }}>({list.length})</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Title</th>
                    <th style={th}>Status</th>
                    <th style={th}>Move to category</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--si-border)', background: i % 2 === 0 ? 'var(--si-white)' : 'transparent' }}>
                      <td style={{ ...cell, fontWeight: 500, color: 'var(--si-dark-text)' }}>{p.title}</td>
                      <td style={cell}>
                        <span style={{ background: p.is_active ? '#EDF7F0' : 'var(--si-linen)', color: p.is_active ? '#1A6B3C' : 'var(--si-muted)', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={cell}>
                        <form action={setProductCategory} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          <input type="hidden" name="id" value={p.id} />
                          <input name="category" list="category-options" defaultValue={p.category ?? ''} placeholder="Uncategorized" style={{ ...inputSm, width: 150 }} />
                          <button type="submit" style={btnSm}>Save</button>
                        </form>
                      </td>
                      <td style={{ ...cell, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem', alignItems: 'center' }}>
                          <form action={duplicateProduct}>
                            <input type="hidden" name="id" value={p.id} />
                            <button type="submit" style={btnSm} title="Create a full copy (modules + lessons), saved as inactive">Duplicate</button>
                          </form>
                          <Link href={`/admin/content/${p.slug}`} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
                            Edit →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
