'use client'

export default function UsersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      <h2 style={{ color: '#8B2A1A', marginBottom: '1rem' }}>Something went wrong</h2>
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 6, fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {error.message || 'Unknown error'}
        {error.digest ? `\nDigest: ${error.digest}` : ''}
      </pre>
      <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>Try again</button>
    </div>
  )
}
