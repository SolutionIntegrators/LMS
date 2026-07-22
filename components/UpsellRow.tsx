'use client'

import { useEffect, useState } from 'react'
import type { RecommendedProduct } from '@/lib/recommendations'
import RecommendedCard from './RecommendedCard'
import EmbedFrame from './EmbedFrame'

// "You may also be interested in" — a row of locked upsell cards on the
// dashboard. Owns a single shared shadowbox (reusing the WelcomeBanner modal
// pattern: scroll-lock + Esc + backdrop-close) that iframes a product's sales
// page for cards set to lightbox mode. Sales pages that block framing show
// nothing inside the frame, so an "open in new tab" link is always offered.
export default function UpsellRow({ products }: { products: RecommendedProduct[] }) {
  const [box, setBox] = useState<{ url: string; title: string } | null>(null)

  useEffect(() => {
    if (!box) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBox(null) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [box])

  if (products.length === 0) return null

  return (
    <section style={{ marginTop: '3.5rem' }}>
      <h2
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(1.35rem, 3vw, 1.85rem)',
          fontWeight: 400,
          color: 'var(--si-denim-blue)',
          lineHeight: 1.2,
          marginBottom: '1.5rem',
        }}
      >
        You may also be interested in
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {products.map((p) => (
          <RecommendedCard key={p.id} product={p} onLightbox={(url, title) => setBox({ url, title })} />
        ))}
      </div>

      {box && (
        <div
          onClick={() => setBox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={box.title}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(20,26,32,0.78)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 1040 }}>
            <div
              style={{
                position: 'absolute', top: -40, right: 0, left: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: '#FCF1E8', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem',
              }}
            >
              <a
                href={box.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FCF1E8', textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                Open in new tab ↗
              </a>
              <button
                type="button"
                onClick={() => setBox(null)}
                aria-label="Close"
                style={{
                  background: 'transparent', border: 'none', color: '#FCF1E8',
                  fontSize: '1.6rem', lineHeight: 1, cursor: 'pointer', padding: '0 0.25rem',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--si-white)', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}>
              <EmbedFrame src={box.url} title={box.title} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
