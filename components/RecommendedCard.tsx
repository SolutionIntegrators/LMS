'use client'

import type { RecommendedProduct } from '@/lib/recommendations'

// A "locked" upsell card for a product the user doesn't own yet. Mirrors
// ProductCard's shell (cover band + category chip) but adds a lock badge and a
// buy CTA. In new_tab mode the whole card is a link; in lightbox mode it's a
// button that asks the parent (UpsellRow) to open the sales-page shadowbox.
export default function RecommendedCard({
  product,
  onLightbox,
}: {
  product: RecommendedProduct
  onLightbox: (url: string, title: string) => void
}) {
  const cover = (
    <div
      style={{
        position: 'relative',
        height: 160,
        background: product.cover_image_url
          ? `url(${product.cover_image_url}) center/cover`
          : `linear-gradient(135deg, ${product.thumbnail_color || 'var(--si-denim-blue)'} 0%, #2C3D4A 100%)`,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '1rem',
      }}
    >
      {/* Lock badge (top-right) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'rgba(20,26,32,0.55)',
          color: '#FCF1E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.9rem',
          WebkitBackdropFilter: 'blur(4px)',
          backdropFilter: 'blur(4px)',
        }}
      >
        🔒
      </span>
      {product.category && (
        <span
          style={{
            background: 'var(--si-burnt-orange)',
            color: 'white',
            fontSize: '0.75rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '0.25rem 0.625rem',
            borderRadius: 4,
          }}
        >
          {product.category}
        </span>
      )}
    </div>
  )

  const body = (
    <div style={{ padding: '1.5rem' }}>
      <h3
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600,
          fontSize: '1.125rem',
          color: 'var(--si-dark-text)',
          marginBottom: '1rem',
          lineHeight: 1.3,
        }}
      >
        {product.title}
      </h3>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--si-burnt-orange)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600,
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {product.ctaLabel}
      </div>
    </div>
  )

  const cardStyle: React.CSSProperties = {
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'block',
    width: '100%',
    textAlign: 'left',
    textDecoration: 'none',
    border: 'none',
    background: 'var(--si-white)',
    font: 'inherit',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }

  const hoverOn = (el: HTMLElement) => {
    el.style.transform = 'translateY(-2px)'
    el.style.boxShadow = '0 8px 32px rgba(58,79,94,0.15)'
  }
  const hoverOff = (el: HTMLElement) => {
    el.style.transform = 'translateY(0)'
    el.style.boxShadow = 'var(--si-shadow-card)'
  }

  if (product.ctaMode === 'lightbox') {
    return (
      <button
        type="button"
        className="card product-card"
        style={cardStyle}
        onClick={() => onLightbox(product.destinationUrl, product.title)}
        onMouseEnter={(e) => hoverOn(e.currentTarget)}
        onMouseLeave={(e) => hoverOff(e.currentTarget)}
      >
        {cover}
        {body}
      </button>
    )
  }

  return (
    <a
      className="card product-card"
      href={product.destinationUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={cardStyle}
      onMouseEnter={(e) => hoverOn(e.currentTarget)}
      onMouseLeave={(e) => hoverOff(e.currentTarget)}
    >
      {cover}
      {body}
    </a>
  )
}
