'use client'

import { useState } from 'react'
import type { Block, BlockType } from '@/lib/blocks'

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
}

const labelText: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--si-muted)',
}

const miniBtn: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.75rem',
  fontWeight: 500,
  padding: '0.25rem 0.5rem',
  borderRadius: 5,
  border: '1px solid var(--si-border)',
  background: 'var(--si-white)',
  color: 'var(--si-dark-text)',
  cursor: 'pointer',
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'b_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function makeBlock(type: BlockType): Block {
  switch (type) {
    case 'heading': return { id: newId(), type: 'heading', text: '', level: 'h2' }
    case 'text': return { id: newId(), type: 'text', text: '' }
    case 'button': return { id: newId(), type: 'button', label: '', url: '', newTab: true, variant: 'filled', align: 'left' }
    case 'divider': return { id: newId(), type: 'divider' }
    case 'image': return { id: newId(), type: 'image', url: '', alt: '', align: 'center', size: 'full' }
    case 'bullets': return { id: newId(), type: 'bullets', items: [''] }
    case 'html': return { id: newId(), type: 'html', html: '' }
  }
}

const PALETTE: { type: BlockType; label: string; icon: string }[] = [
  { type: 'button', label: 'Button', icon: '⬭' },
  { type: 'heading', label: 'Heading', icon: 'H' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'bullets', label: 'Bullets', icon: '☰' },
  { type: 'image', label: 'Image', icon: '🖼' },
  { type: 'divider', label: 'Divider', icon: '—' },
  { type: 'html', label: 'HTML', icon: '</>' },
]

export default function LessonBlocksEditor({
  lessonId,
  defaultBlocks,
}: {
  lessonId: string
  defaultBlocks: Block[]
}) {
  const [blocks, setBlocks] = useState<Block[]>(defaultBlocks ?? [])

  function update(id: string, patch: Partial<Block>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)))
  }
  function add(type: BlockType) {
    setBlocks((bs) => [...bs, makeBlock(type)])
  }
  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id))
  }
  function move(id: string, dir: -1 | 1) {
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= bs.length) return bs
      const copy = [...bs]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <input type="hidden" name="content_blocks" value={JSON.stringify(blocks)} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {blocks.length === 0 && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--si-muted)', margin: 0 }}>
            No elements yet. Add one below — they appear on the lesson page beneath the main video/media.
          </p>
        )}

        {blocks.map((block, i) => (
          <div key={block.id} style={{ border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.875rem', background: 'var(--si-white)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--si-denim-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {block.type}
              </span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button type="button" style={miniBtn} onClick={() => move(block.id, -1)} disabled={i === 0}>↑</button>
                <button type="button" style={miniBtn} onClick={() => move(block.id, 1)} disabled={i === blocks.length - 1}>↓</button>
                <button type="button" style={{ ...miniBtn, color: '#8B2A1A', borderColor: '#f5c6c0', background: '#FDF0EE' }} onClick={() => remove(block.id)}>Remove</button>
              </div>
            </div>
            <BlockFields block={block} update={update} lessonId={lessonId} />
          </div>
        ))}
      </div>

      {/* Add element palette */}
      <div style={{ borderTop: '1px dashed var(--si-border)', paddingTop: '0.75rem' }}>
        <p style={{ ...labelText, marginBottom: '0.5rem' }}>Add element</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {PALETTE.map((p) => (
            <button key={p.type} type="button" onClick={() => add(p.type)}
              style={{ ...miniBtn, fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <span aria-hidden style={{ fontWeight: 700 }}>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={labelText}>{label}</span>
      {children}
    </label>
  )
}

const alignOptions: { value: 'left' | 'center' | 'right'; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

function BlockFields({
  block,
  update,
  lessonId,
}: {
  block: Block
  update: (id: string, patch: Partial<Block>) => void
  lessonId: string
}) {
  switch (block.type) {
    case 'heading':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '0.625rem' }}>
          <Field label="Heading text">
            <input style={inputStyle} value={block.text} onChange={(e) => update(block.id, { text: e.target.value })} />
          </Field>
          <Field label="Size">
            <select style={inputStyle} value={block.level} onChange={(e) => update(block.id, { level: e.target.value as 'h2' | 'h3' })}>
              <option value="h2">Large (H2)</option>
              <option value="h3">Small (H3)</option>
            </select>
          </Field>
        </div>
      )

    case 'text':
      return (
        <Field label="Text">
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={block.text} onChange={(e) => update(block.id, { text: e.target.value })} />
        </Field>
      )

    case 'button':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <Field label="Button label">
              <input style={inputStyle} value={block.label} onChange={(e) => update(block.id, { label: e.target.value })} placeholder="e.g. Access Template" />
            </Field>
            <Field label="Link URL">
              <input style={inputStyle} value={block.url} onChange={(e) => update(block.id, { url: e.target.value })} placeholder="https://…" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', alignItems: 'end' }}>
            <Field label="Style">
              <select style={inputStyle} value={block.variant} onChange={(e) => update(block.id, { variant: e.target.value as 'filled' | 'outline' })}>
                <option value="filled">Filled</option>
                <option value="outline">Outline</option>
              </select>
            </Field>
            <Field label="Alignment">
              <select style={inputStyle} value={block.align} onChange={(e) => update(block.id, { align: e.target.value as any })}>
                {alignOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-dark-text)', cursor: 'pointer', paddingBottom: '0.55rem' }}>
              <input type="checkbox" checked={block.newTab} onChange={(e) => update(block.id, { newTab: e.target.checked })} style={{ width: 15, height: 15, accentColor: 'var(--si-burnt-orange)' }} />
              Open in new tab
            </label>
          </div>
        </div>
      )

    case 'divider':
      return <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-muted)', margin: 0 }}>A horizontal divider line.</p>

    case 'image':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <Field label="Image URL">
            <input style={inputStyle} value={block.url} onChange={(e) => update(block.id, { url: e.target.value })} placeholder="https://…/image.jpg" />
          </Field>
          <ImageUpload lessonId={lessonId} onUploaded={(url) => update(block.id, { url })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
            <Field label="Alt text">
              <input style={inputStyle} value={block.alt} onChange={(e) => update(block.id, { alt: e.target.value })} placeholder="Describe the image" />
            </Field>
            <Field label="Size">
              <select style={inputStyle} value={block.size} onChange={(e) => update(block.id, { size: e.target.value as any })}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="full">Full width</option>
              </select>
            </Field>
            <Field label="Alignment">
              <select style={inputStyle} value={block.align} onChange={(e) => update(block.id, { align: e.target.value as any })}>
                {alignOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          {block.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.url} alt={block.alt || ''} style={{ maxWidth: 200, height: 'auto', borderRadius: 6, border: '1px solid var(--si-border)' }} />
          )}
        </div>
      )

    case 'bullets':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={labelText}>List items</span>
          {block.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.4rem' }}>
              <input style={inputStyle} value={item} placeholder={`Item ${idx + 1}`}
                onChange={(e) => {
                  const items = [...block.items]; items[idx] = e.target.value
                  update(block.id, { items })
                }} />
              <button type="button" style={{ ...miniBtn, color: '#8B2A1A' }} disabled={block.items.length === 1}
                onClick={() => update(block.id, { items: block.items.filter((_, k) => k !== idx) })}>✕</button>
            </div>
          ))}
          <button type="button" style={{ ...miniBtn, alignSelf: 'flex-start', marginTop: '0.25rem' }}
            onClick={() => update(block.id, { items: [...block.items, ''] })}>+ Add item</button>
        </div>
      )

    case 'html':
      return (
        <Field label="HTML">
          <textarea style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} rows={5}
            value={block.html} onChange={(e) => update(block.id, { html: e.target.value })}
            placeholder="<div>Your custom HTML…</div>" />
        </Field>
      )
  }
}

function ImageUpload({ lessonId, onUploaded }: { lessonId: string; onUploaded: (url: string) => void }) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle')

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('uploading')
    try {
      const res = await fetch(`/api/admin/r2-presign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}&lessonId=${lessonId}`)
      if (!res.ok) throw new Error(await res.text())
      const { presignedUrl, publicUrl } = await res.json()
      const put = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!put.ok) throw new Error('upload failed')
      onUploaded(publicUrl)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label style={{ ...miniBtn, display: 'inline-block' }}>
        {status === 'uploading' ? 'Uploading…' : 'Upload image'}
        <input type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
      </label>
      {status === 'error' && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: '#8B2A1A' }}>Upload failed</span>}
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>or paste a URL above</span>
    </div>
  )
}
