'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  lessonId: string
  currentUrl: string | null
  onUploaded?: (url: string) => void
}

function sanitize(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'file'
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() : ''
  return ext ? `${base}.${ext}` : base
}

export default function LessonFileUpload({ lessonId, currentUrl, onUploaded }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setStatus('uploading')
    setErrorMsg(null)
    try {
      const path = `${lessonId}/${Date.now()}-${sanitize(file.name)}`
      const { error } = await supabase.storage.from('lesson-content').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })
      if (error) throw error
      const { data } = supabase.storage.from('lesson-content').getPublicUrl(path)
      onUploaded?.(data.publicUrl)
      setStatus('done')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.message || 'Upload failed')
      setStatus('error')
    }
  }

  return (
    <div style={{
      border: '1.5px dashed var(--si-border)',
      borderRadius: 'var(--si-radius-sm)',
      padding: '1rem 1.25rem',
      background: 'var(--si-linen)',
    }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)', marginBottom: '0.75rem' }}>
        Upload a file (sets the Content URL automatically)
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,application/pdf,audio/*,image/*"
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--si-dark-text)' }}
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={status === 'uploading'}
          style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: 500,
            padding: '0.4rem 1rem', borderRadius: 6, border: 'none',
            background: status === 'uploading' ? 'var(--si-muted)' : 'var(--si-denim-blue)',
            color: 'white', cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'uploading' ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {status === 'done' && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: '#1A6B3C', marginTop: '0.5rem' }}>
          ✓ Uploaded — URL set in Content URL above. Click Save Lesson to keep it.
        </p>
      )}
      {status === 'error' && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: '#8B2A1A', marginTop: '0.5rem' }}>
          Upload failed{errorMsg ? `: ${errorMsg}` : ''}.
        </p>
      )}
      {currentUrl && status === 'idle' && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)', marginTop: '0.5rem', wordBreak: 'break-all' }}>
          Current: {currentUrl}
        </p>
      )}
    </div>
  )
}
