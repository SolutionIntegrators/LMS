'use client'

import { useState } from 'react'

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
    help: 'Paste the embed URL from Loom, Vimeo, or YouTube. In Loom: Share → Embed → copy the src URL. In YouTube: Share → Embed → copy the src from the iframe.',
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
  text: {
    label: '',
    placeholder: '',
    help: '',
    hidden: true,
  },
  download: {
    label: 'File URL',
    placeholder: 'https://…',
    help: 'Direct download link for the file.',
  },
}

export default function LessonContentFields({
  defaultType,
  defaultUrl,
}: {
  defaultType: string | null
  defaultUrl: string | null
}) {
  const [type, setType] = useState(defaultType ?? '')
  // Controlled so edits survive type switches without being lost
  const [url, setUrl] = useState(defaultUrl ?? '')

  const config = fieldConfig[type]
  const showUrlField = config && !config.hidden

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>
          Content Type
        </span>
        <select
          name="content_type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={inputStyle}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      {showUrlField && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>
            {config.label}
          </span>
          <input
            name="content_url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={config.placeholder}
            style={inputStyle}
          />
          {config.help && <p style={helpText}>{config.help}</p>}
        </label>
      )}

      {/* Always submit content_url — empty for text/no-type */}
      {!showUrlField && (
        <input type="hidden" name="content_url" value={type === 'text' ? '' : url} />
      )}
    </div>
  )
}
