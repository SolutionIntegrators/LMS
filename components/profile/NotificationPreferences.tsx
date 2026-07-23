'use client'

import { useState } from 'react'
import { toggleCommunitySubscription } from '@/app/profile/actions'

export interface SubscriptionItem {
  productId: string
  productTitle: string
  subscribed: boolean
}

export default function NotificationPreferences({ subscriptions }: { subscriptions: SubscriptionItem[] }) {
  const [items, setItems] = useState(subscriptions)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleToggle(productId: string, next: boolean) {
    setPendingId(productId)
    try {
      const fd = new FormData()
      fd.set('product_id', productId)
      fd.set('subscribed', String(next))
      await toggleCommunitySubscription(fd)
      setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, subscribed: next } : i)))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)', margin: 0 }}>
        Get emailed about new threads and replies in a course's community. Muting one thread (from inside it) only
        silences that thread — turn a whole course off here.
      </p>
      {items.map((item) => (
        <label key={item.productId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', color: 'var(--si-dark-text)' }}>{item.productTitle}</span>
          <input
            type="checkbox"
            checked={item.subscribed}
            disabled={pendingId === item.productId}
            onChange={(e) => handleToggle(item.productId, e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--si-burnt-orange)' }}
          />
        </label>
      ))}
    </div>
  )
}
