export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer
      style={{
        borderTop: '1px solid var(--si-border)',
        background: 'var(--si-white)',
        padding: '1.25rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem 1.5rem',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '0.8125rem',
          color: 'var(--si-muted)',
        }}
      >
        <span>© {year} Solution Integrators. All rights reserved.</span>
        <span style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <a
            href="https://solutionintegrators.us/shop"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--si-burnt-orange)', textDecoration: 'none', fontWeight: 600 }}
          >
            Want more goodies? Visit the shop →
          </a>
          <a
            href="https://solutionintegrators.us/digital-product-terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--si-burnt-orange)', textDecoration: 'none', fontWeight: 500 }}
          >
            Digital Product Terms &amp; Conditions
          </a>
        </span>
      </div>
    </footer>
  )
}
