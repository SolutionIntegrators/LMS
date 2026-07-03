'use client'

import { useState } from 'react'

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard unavailable (http/permission) — select-able fallback below
      window.prompt('Copy the link:', url)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={url}
      style={{
        fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: 4,
        border: '1px solid var(--si-border)', cursor: 'pointer', whiteSpace: 'nowrap',
        fontFamily: 'DM Sans, sans-serif',
        background: copied ? '#EDF7F0' : 'var(--si-white)',
        color: copied ? '#1A6B3C' : 'var(--si-dark-text)',
      }}
    >
      {copied ? 'Copied ✓' : 'Copy link'}
    </button>
  )
}
