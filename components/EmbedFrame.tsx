'use client'

import { useEffect, useRef, useState } from 'react'

// Iframe for embeds (forms, Airtable, Notion, docs…).
// Cross-origin iframes can't be measured directly, so:
// 1. Listen for the common "height" postMessage patterns many embed
//    providers broadcast (iframe-resizer, Typeform, Tally, ClickUp, etc.)
//    and resize to match.
// 2. Otherwise fall back to a tall, near-viewport height with internal
//    scrolling so long content (like support forms) is comfortably usable.
export default function EmbedFrame({ src, title }: { src: string; title?: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Only accept messages from the embedded frame
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return

      let h: number | null = null
      const d: any = e.data

      if (typeof d === 'number' && isFinite(d)) h = d
      else if (typeof d === 'string') {
        // iframe-resizer style: "[iFrameSizer]…:height:width" or plain number
        const m = d.match(/(?:height[=:"\s]+)(\d{2,5})/i) ?? d.match(/^(\d{2,5})$/)
        if (m) h = parseInt(m[1], 10)
      } else if (d && typeof d === 'object') {
        const candidate = d.height ?? d.frameHeight ?? d.iframeHeight ?? d.payload?.height ?? d.data?.height
        if (typeof candidate === 'number' && isFinite(candidate)) h = candidate
        else if (typeof candidate === 'string' && /^\d+$/.test(candidate)) h = parseInt(candidate, 10)
      }

      if (h && h >= 200 && h <= 8000) setHeight(h + 24)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title ?? 'Embedded content'}
      allowFullScreen
      style={{
        width: '100%',
        border: 'none',
        borderRadius: 'var(--si-radius-sm)',
        display: 'block',
        height: height ? `${height}px` : 'max(600px, calc(100vh - 220px))',
        transition: 'height 0.2s ease',
        background: 'var(--si-white)',
      }}
    />
  )
}
