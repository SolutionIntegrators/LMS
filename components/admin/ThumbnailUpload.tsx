'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  productId: string
  onUploaded: (url: string) => void
}

function sanitize(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'image'
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() : ''
  return ext ? `${base}.${ext}` : base
}

// Uploads a product thumbnail image directly (reuses the existing public
// lesson-content bucket — admin-write, public-read — so no new storage
// bucket/migration is needed). Avoids the common mistake of pasting a
// Google Drive/Dropbox "share" link into the Thumbnail URL field, which
// looks like a URL but isn't a direct image link and won't render.
export default function ThumbnailUpload({ productId, onUploaded }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setStatus('uploading')
    setErrorMsg(null)
    try {
      const path = `thumbnails/${productId}/${Date.now()}-${sanitize(file.name)}`
      const { error } = await supabase.storage.from('lesson-content').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })
      if (error) throw error
      const { data } = supabase.storage.from('lesson-content').getPublicUrl(path)
      onUploaded(data.publicUrl)
      setStatus('idle')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.message || 'Upload failed')
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-dark-text)' }}
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={status === 'uploading'}
          style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500,
            padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none',
            background: status === 'uploading' ? 'var(--si-muted)' : 'var(--si-denim-blue)',
            color: 'white', cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'uploading' ? 'Uploading…' : 'Upload image'}
        </button>
      </div>
      {status === 'error' && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: '#8B2A1A', margin: 0 }}>
          Upload failed{errorMsg ? `: ${errorMsg}` : ''}.
        </p>
      )}
    </div>
  )
}
