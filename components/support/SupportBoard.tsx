'use client'

import { useState } from 'react'
import SupportForm from './SupportForm'
import { getMyRequests } from '@/app/support/actions'

export interface SupportRequestItem {
  id: string
  subject: string
  description: string
  product_slug: string | null
  client_visible_status: string | null
  resolution: string | null
  additional_info_needed: string | null
  created_at: string
  updated_at: string
}

// Matches ClickUp's own status colors on "The Goodies Shop" list.
const STATUS_COLORS: Record<string, string> = {
  'new tickets': '#e16b16',
  'working on it': '#d40f7a',
  'pending client feedback': '#e5484d',
  testing: '#87909e',
  resolved: '#008844',
}

function StatusBadge({ status }: { status: string | null }) {
  const color = (status && STATUS_COLORS[status]) || '#87909e'
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: 999,
      background: color, color: 'white', fontFamily: 'DM Sans, sans-serif',
      fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
    }}>
      {status || 'submitted'}
    </span>
  )
}

export default function SupportBoard({
  initialRequests,
  products,
}: {
  initialRequests: SupportRequestItem[]
  products: Array<{ slug: string; title: string }>
}) {
  const [requests, setRequests] = useState(initialRequests)

  async function refresh() {
    try {
      setRequests(await getMyRequests())
    } catch {
      // best-effort refresh; keep showing whatever we already have
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <SupportForm products={products} onSubmitted={refresh} />

      <div>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: 'var(--si-denim-blue)', marginBottom: '1rem' }}>
          My requests
        </h2>
        {requests.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>You haven&apos;t submitted any requests yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {requests.map((r) => (
              <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--si-dark-text)' }}>{r.subject}</span>
                  <StatusBadge status={r.client_visible_status} />
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>
                  {r.description}
                </p>
                {r.product_slug && (
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)', marginBottom: '0.5rem' }}>
                    Course: {r.product_slug}
                  </div>
                )}
                {r.additional_info_needed && r.client_visible_status !== 'resolved' && (
                  <div style={{ background: '#FDF1E7', border: '1.5px solid #E16B16', borderRadius: 'var(--si-radius-sm)', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', fontWeight: 600, color: '#B4500F', margin: '0 0 0.25rem' }}>⚠ Additional info needed</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-dark-text)', whiteSpace: 'pre-wrap', margin: 0 }}>{r.additional_info_needed}</p>
                  </div>
                )}
                {r.resolution && (
                  <div style={{ background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--si-denim-blue)', margin: '0 0 0.25rem' }}>Resolution</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-dark-text)', whiteSpace: 'pre-wrap', margin: 0 }}>{r.resolution}</p>
                  </div>
                )}
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>
                  Submitted {new Date(r.created_at).toLocaleDateString()}
                  {r.updated_at !== r.created_at && ` · Updated ${new Date(r.updated_at).toLocaleDateString()}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
