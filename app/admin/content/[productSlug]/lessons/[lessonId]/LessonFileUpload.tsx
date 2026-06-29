'use client'

import { useState, useRef } from 'react'

interface Props {
  lessonId: string
  currentUrl: string | null
  onUploaded?: (url: string) => void
}

export default function LessonFileUpload({ lessonId, currentUrl, onUploaded }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setStatus('uploading')
    setProgress(0)

    try {
      // 1. Get presigned URL from our API
      const res = await fetch(
        `/api/admin/r2-presign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}&lessonId=${lessonId}`
      )
      if (!res.ok) throw new Error(await res.text())
      const { presignedUrl, publicUrl } = await res.json()

      // 2. Upload directly to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('PUT', presignedUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      // 3. Notify parent so it can update the content_url field
      onUploaded?.(publicUrl)
      setUploadedUrl(publicUrl)
      setStatus('done')
    } catch (err: any) {
      console.error(err)
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
        Upload file to R2 (sets Content URL automatically)
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
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.85rem',
            fontWeight: 500,
            padding: '0.4rem 1rem',
            borderRadius: 6,
            border: 'none',
            background: status === 'uploading' ? 'var(--si-muted)' : 'var(--si-denim-blue)',
            color: 'white',
            cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'uploading' ? `Uploading ${progress}%…` : 'Upload'}
        </button>
      </div>

      {status === 'done' && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: '#1A6B3C', marginTop: '0.5rem' }}>
          ✓ Uploaded — URL set in Content URL field above. Click Save Lesson to keep it.
        </p>
      )}
      {status === 'error' && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: '#8B2A1A', marginTop: '0.5rem' }}>
          Upload failed. Make sure R2 env vars are configured (CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).
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
