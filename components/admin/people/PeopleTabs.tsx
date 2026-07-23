'use client'

import { useState } from 'react'
import StudentsPane, { type StudentUser } from './StudentsPane'
import AffiliatesPane, { type AffiliateWithLinks } from './AffiliatesPane'

const tabBtn = (active: boolean): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.6rem 0.2rem',
  marginRight: '1.5rem',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.9375rem',
  fontWeight: 600,
  color: active ? 'var(--si-burnt-orange)' : 'var(--si-muted)',
  borderBottom: `2px solid ${active ? 'var(--si-burnt-orange)' : 'transparent'}`,
  position: 'relative',
  top: 1,
})

export default function PeopleTabs({
  users,
  products,
  affiliates,
}: {
  users: StudentUser[]
  products: Array<{ id: string; title: string }>
  affiliates: AffiliateWithLinks[]
}) {
  const [tab, setTab] = useState<'students' | 'affiliates'>('students')

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--si-border)', marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => setTab('students')} style={tabBtn(tab === 'students')}>
          Students <span style={{ fontWeight: 700, opacity: 0.75 }}>({users.length})</span>
        </button>
        <button type="button" onClick={() => setTab('affiliates')} style={tabBtn(tab === 'affiliates')}>
          Affiliates <span style={{ fontWeight: 700, opacity: 0.75 }}>({affiliates.length})</span>
        </button>
      </div>

      <div style={{ display: tab === 'students' ? 'block' : 'none' }}>
        <StudentsPane users={users} products={products} />
      </div>
      <div style={{ display: tab === 'affiliates' ? 'block' : 'none' }}>
        <AffiliatesPane affiliates={affiliates} products={products} />
      </div>
    </div>
  )
}
