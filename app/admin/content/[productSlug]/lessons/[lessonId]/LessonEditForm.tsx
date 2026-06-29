'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { updateLesson } from '../../../actions'
import LessonFileUpload from './LessonFileUpload'

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
}

const labelText: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: 'var(--si-muted)',
}

const helpText: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.75rem',
  color: 'var(--si-muted)',
  marginTop: '0.25rem',
}

const TYPES = [
  { value: '', label: '— Select type —' },
  { value: 'video', label: 'Video (embed)' },
  { value: 'embed', label: 'Embed (Airtable, Notion, form…)' },
  { value: 'pdf', label: 'PDF' },
  { value: 'text', label: 'Text only' },
  { value: 'download', label: 'Download' },
]

const fieldConfig: Record<string, { label: string; placeholder: string; help: string; hidden?: boolean }> = {
  video: {
    label: 'Embed URL',
    placeholder: 'https://www.loom.com/embed/… or https://player.vimeo.com/video/…',
    help: 'Paste the embed URL from Loom, Vimeo, or YouTube. In Loom: Share → Embed → copy the src URL.',
  },
  embed: {
    label: 'Embed URL',
    placeholder: 'https://airtable.com/embed/… or https://docs.google.com/…',
    help: 'Paste the embed URL (the src value from the iframe code).',
  },
  pdf: {
    label: 'PDF URL',
    placeholder: 'https://…/file.pdf',
    help: 'Direct link to the PDF file.',
  },
  text: { label: '', placeholder: '', help: '', hidden: true },
  download: {
    label: 'File URL',
    placeholder: 'https://…',
    help: 'Direct download link for the file.',
  },
}

type State = { ok: boolean; error: string | null } | null

async function lessonAction(_prev: State, formData: FormData): Promise<State> {
  try {
    await updateLesson(formData)
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to save lesson' }
  }
}

interface LessonData {
  id: string
  title: string
  description: string | null
  content_type: string | null
  content_url: string | null
  is_published: boolean
  is_preview?: boolean
  required_tag?: string | null
}

export default function LessonEditForm({
  lesson,
  productSlug,
}: {
  lesson: LessonData
  productSlug: string
}) {
  const [state, formAction, pending] = useActionState(lessonAction, null)
  const [contentType, setContentType] = useState(lesson.content_type ?? '')
  const [contentUrl, setContentUrl] = useState(lesson.content_url ?? '')

  const config = fieldConfig[contentType]
  const showUrlField = config && !config.hidden

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.5rem', color: 'var(--si-denim-blue)', marginBottom: '1.75rem' }}>
        Edit Lesson
      </h1>

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <input type="hidden" name="id" value={lesson.id} />

        <label style={labelStyle}>
          <span style={labelText}>Title *</span>
          <input name="title" defaultValue={lesson.title} required style={inputStyle} />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Description</span>
          <textarea name="description" defaultValue={lesson.description ?? ''} rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </label>

        {/* Content type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={labelStyle}>
            <span style={labelText}>Content Type</span>
            <select
              name="content_type"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              style={inputStyle}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          {showUrlField && (
            <label style={labelStyle}>
              <span style={labelText}>{config.label}</span>
              <input
                name="content_url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder={config.placeholder}
                style={inputStyle}
              />
              {config.help && <p style={helpText}>{config.help}</p>}
            </label>
          )}
          {!showUrlField && (
            <input type="hidden" name="content_url" value={contentType === 'text' ? '' : contentUrl} />
          )}
        </div>

        {/* R2 file upload — sets content URL on upload */}
        <LessonFileUpload
          lessonId={lesson.id}
          currentUrl={lesson.content_url}
          onUploaded={(url) => {
            setContentType((t) => t || 'download')
            setContentUrl(url)
          }}
        />

        {/* Access control */}
        <div style={{ background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: 'var(--si-denim-blue)', margin: 0 }}>
            Access Control
          </p>
          <label style={labelStyle}>
            <span style={labelText}>Required tag (leave blank = all students with product access)</span>
            <input
              name="required_tag"
              defaultValue={lesson.required_tag ?? ''}
              placeholder="e.g. vip, tier2, bonus"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', color: 'var(--si-dark-text)', cursor: 'pointer' }}>
            <input type="checkbox" name="is_published" defaultChecked={lesson.is_published}
              style={{ width: 16, height: 16, accentColor: 'var(--si-burnt-orange)' }} />
            Published (visible to students)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', color: 'var(--si-dark-text)', cursor: 'pointer' }}>
            <input type="checkbox" name="is_preview" defaultChecked={lesson.is_preview ?? false}
              style={{ width: 16, height: 16, accentColor: 'var(--si-burnt-orange)' }} />
            Free preview (anyone logged in can watch without purchasing)
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--si-border)', flexWrap: 'wrap' }}>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? 'Saving…' : 'Save Lesson'}
          </button>
          <Link href={`/admin/content/${productSlug}`} style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)',
            textDecoration: 'none', display: 'flex', alignItems: 'center',
          }}>
            ← Back to product
          </Link>
          {state?.ok && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#1A6B3C' }}>Saved ✓</span>
          )}
          {state?.error && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#8B2A1A' }}>
              Error: {state.error}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
