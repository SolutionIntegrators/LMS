'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  userId: string
  currentUrl: string | null
  onUploaded: (url: string) => void
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() : 'jpg'
}

export default function AvatarUpload({ userId, currentUrl, onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFileChange() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setStatus('uploading')
    setErrorMsg(null)
    try {
      const path = `${userId}/avatar-${Date.now()}.${extOf(file.name)}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setPreview(data.publicUrl)
      onUploaded(data.publicUrl)
      setStatus('idle')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.message || 'Upload failed')
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        background: 'var(--si-denim-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.75rem' }}>?</span>
        )}
      </div>
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={status === 'uploading'}
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--si-dark-text)' }}
        />
        {status === 'uploading' && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-muted)', marginTop: '0.375rem' }}>Uploading…</p>}
        {status === 'error' && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: '#8B2A1A', marginTop: '0.375rem' }}>{errorMsg}</p>}
      </div>
    </div>
  )
}
