'use client'

import Link from 'next/link'
import { branding } from '@/lib/branding'

interface Props {
  product: {
    id: string
    title: string
    slug: string
    description: string | null
    cover_image_url: string | null
    thumbnail_url?: string | null
    thumbnail_color?: string | null
  }
}

export default function ProductCard({ product }: Props) {
  // Prefer the admin "Thumbnail URL" field, then a legacy cover image, then a
  // solid brand color, then the default gradient.
  const image = product.thumbnail_url || product.cover_image_url
  const headerBackground = image
    ? `url(${image}) center/cover`
    : product.thumbnail_color
      ? product.thumbnail_color
      : 'linear-gradient(135deg, var(--si-denim-blue) 0%, #2C3D4A 100%)'
  return (
    <Link href={`/products/${product.slug}`} style={{ textDecoration: 'none' }}>
      <div
        className="card product-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(58,79,94,0.15)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--si-shadow-card)'
        }}
      >
        <div
          style={{
            height: 160,
            background: headerBackground,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '1rem',
          }}
        >
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
            {branding.productNoun}
          </span>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <h2
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: '1.125rem',
              color: 'var(--si-dark-text)',
              marginBottom: '0.5rem',
              lineHeight: 1.3,
            }}
          >
            {product.title}
          </h2>
          {product.description && (
            <p
              style={{
                color: 'var(--si-muted)',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.description}
            </p>
          )}
          <div
            style={{
              marginTop: '1.25rem',
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
            {branding.productOpenLabel}
          </div>
        </div>
      </div>
    </Link>
  )
}
