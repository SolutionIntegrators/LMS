'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
  resize: 'vertical' as const,
}

const toolBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '0.35rem 0.5rem',
  borderRadius: 4,
  color: 'var(--si-dark-text)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.9rem',
  lineHeight: 1,
}

function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'image'
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() : ''
  return ext ? `${base}.${ext}` : base
}

// Toolbar + textarea that inserts the same lightweight markdown lib/markdown.ts
// renders: **bold**, *italic*, "- " bullets, "1. " numbers, [text](url) links,
// and ![alt](url) images (uploaded to the community-uploads storage bucket).
export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const supabase = createClient()

  function applyEdit(next: string, selectionStart: number, selectionEnd: number) {
    onChange(next)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  function wrapSelection(before: string, after: string = before) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    applyEdit(next, start + before.length, start + before.length + selected.length)
  }

  function prefixLines(prefix: (i: number) => string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    // Extend the selection to whole lines.
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEndIdx = value.indexOf('\n', end)
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
    const block = value.slice(lineStart, lineEnd)
    const lines = block.split('\n')
    const newBlock = lines.map((line, i) => `${prefix(i)}${line}`).join('\n')
    const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd)
    applyEdit(next, lineStart, lineStart + newBlock.length)
  }

  function insertLink() {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const url = window.prompt('Link URL (https://…)')
    if (!url) return
    const label = selected || 'link'
    const snippet = `[${label}](${url})`
    const next = value.slice(0, start) + snippet + value.slice(end)
    applyEdit(next, start + snippet.length, start + snippet.length)
  }

  async function handleUploadClick() {
    fileRef.current?.click()
  }

  async function handleFileSelected() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const path = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage.from('community-uploads').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })
      if (error) throw error
      const { data } = supabase.storage.from('community-uploads').getPublicUrl(path)
      const el = textareaRef.current
      const start = el ? el.selectionStart : value.length
      const end = el ? el.selectionEnd : value.length
      const snippet = `![image](${data.publicUrl})`
      const next = value.slice(0, start) + snippet + value.slice(end)
      applyEdit(next, start + snippet.length, start + snippet.length)
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '0.125rem',
          border: '1.5px solid var(--si-border)', borderBottom: 'none',
          borderTopLeftRadius: 'var(--si-radius-sm)', borderTopRightRadius: 'var(--si-radius-sm)',
          background: 'var(--si-linen)', padding: '0.3rem 0.4rem',
        }}
      >
        <button type="button" title="Bold" onClick={() => wrapSelection('**')} style={{ ...toolBtn, fontWeight: 700 }}>B</button>
        <button type="button" title="Italic" onClick={() => wrapSelection('*')} style={{ ...toolBtn, fontStyle: 'italic' }}>i</button>
        <span style={{ width: 1, height: '1.2rem', background: 'var(--si-border)', margin: '0 0.25rem' }} />
        <button type="button" title="Bulleted list" onClick={() => prefixLines(() => '- ')} style={toolBtn}>☰</button>
        <button type="button" title="Numbered list" onClick={() => prefixLines((i) => `${i + 1}. `)} style={toolBtn}>①</button>
        <span style={{ width: 1, height: '1.2rem', background: 'var(--si-border)', margin: '0 0.25rem' }} />
        <button type="button" title="Link" onClick={insertLink} style={toolBtn}>🔗</button>
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          style={{
            ...toolBtn, marginLeft: 'auto', fontWeight: 500, fontSize: '0.8rem',
            padding: '0.3rem 0.7rem', background: uploading ? 'var(--si-muted)' : 'var(--si-denim-blue)',
            color: 'white', cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Uploading…' : 'Upload image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelected} style={{ display: 'none' }} />
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ ...inputStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
      />
      {uploadError && (
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: '#8B2A1A', marginTop: '0.25rem' }}>
          Upload failed: {uploadError}
        </span>
      )}
    </div>
  )
}
