import type { Block, BlockAlign } from '@/lib/blocks'

const imageMaxWidth: Record<'small' | 'medium' | 'full', number | string> = {
  small: 280,
  medium: 480,
  full: '100%',
}

function alignItems(align: BlockAlign): React.CSSProperties['justifyContent'] {
  return align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
}

export default function LessonBlocks({ blocks }: { blocks: Block[] }) {
  if (!blocks || blocks.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
      {blocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return block.level === 'h3' ? (
              <h3 key={block.id} style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--si-denim-blue)', margin: 0 }}>
                {block.text}
              </h3>
            ) : (
              <h2 key={block.id} style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.5rem', color: 'var(--si-dark-text)', margin: 0, lineHeight: 1.3 }}>
                {block.text}
              </h2>
            )

          case 'text':
            return (
              <p key={block.id} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--si-dark-text)', margin: 0, whiteSpace: 'pre-wrap' }}>
                {block.text}
              </p>
            )

          case 'button': {
            const filled = block.variant === 'filled'
            return (
              <div key={block.id} style={{ display: 'flex', justifyContent: alignItems(block.align) }}>
                <a
                  href={block.url || '#'}
                  target={block.newTab ? '_blank' : undefined}
                  rel={block.newTab ? 'noopener noreferrer' : undefined}
                  style={{
                    display: 'inline-block',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    textDecoration: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--si-radius-sm)',
                    background: filled ? 'var(--si-burnt-orange)' : 'transparent',
                    color: filled ? 'white' : 'var(--si-denim-blue)',
                    border: filled ? '2px solid var(--si-burnt-orange)' : '2px solid var(--si-denim-blue)',
                    cursor: 'pointer',
                  }}
                >
                  {block.label || 'Button'}
                </a>
              </div>
            )
          }

          case 'divider':
            return <hr key={block.id} style={{ border: 'none', borderTop: '1px solid var(--si-border)', margin: '0.25rem 0' }} />

          case 'image':
            if (!block.url) return null
            return (
              <div key={block.id} style={{ display: 'flex', justifyContent: alignItems(block.align) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.url}
                  alt={block.alt || ''}
                  style={{ maxWidth: imageMaxWidth[block.size] ?? '100%', width: block.size === 'full' ? '100%' : undefined, height: 'auto', borderRadius: 'var(--si-radius-sm)', display: 'block' }}
                />
              </div>
            )

          case 'bullets': {
            const items = block.items.filter(Boolean)
            return (
              <ul key={block.id} style={{ margin: 0, paddingLeft: '1.5rem', listStyleType: 'disc', listStylePosition: 'outside' }}>
                {items.map((item, i) => (
                  <li key={i} style={{ display: 'list-item', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--si-dark-text)', marginBottom: i < items.length - 1 ? '0.4rem' : 0 }}>
                    {item}
                  </li>
                ))}
              </ul>
            )
          }

          case 'html':
            return (
              <div key={block.id} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--si-dark-text)' }}
                dangerouslySetInnerHTML={{ __html: block.html }} />
            )

          default:
            return null
        }
      })}
    </div>
  )
}
