'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import EmbedFrame from './EmbedFrame'

interface LessonPlayerProps {
  lessonId: string
  contentType: string | null
  contentUrl: string | null
  userId: string
  isCompleted: boolean
  productId: string | null
  moduleId: string | null
  description?: string | null
  hasBlocks?: boolean
  previewMode?: boolean
  children?: React.ReactNode
}

export default function LessonPlayer({
  lessonId,
  contentType,
  contentUrl,
  userId,
  isCompleted,
  productId,
  moduleId,
  description,
  hasBlocks,
  previewMode,
  children,
}: LessonPlayerProps) {
  const [completed, setCompleted] = useState(isCompleted)
  const [marking, setMarking] = useState(false)
  const supabase = createClient()

  async function markComplete() {
    if (completed || marking) return
    if (previewMode) {
      // Admin preview: show the state change without writing real data
      setCompleted(true)
      return
    }
    setMarking(true)
    await supabase.from('lesson_completions').insert({ user_id: userId, lesson_id: lessonId })
    await supabase.from('activity_logs').insert({
      user_id: userId,
      event_type: 'lesson_completed',
      lesson_id: lessonId,
      product_id: productId,
      module_id: moduleId,
    })
    setCompleted(true)
    setMarking(false)
  }

  return (
    <div>
      {/* Content area */}
      <div style={{ marginBottom: '1.5rem' }}>
        {contentType === 'video' && contentUrl && (
          <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 'var(--si-radius-sm)', overflow: 'hidden', background: '#000' }}>
            <iframe
              src={contentUrl}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {contentType === 'embed' && contentUrl && (
          <EmbedFrame src={contentUrl} />
        )}

        {contentType === 'pdf' && contentUrl && (
          <div style={{ border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', overflow: 'hidden' }}>
            <iframe
              src={contentUrl}
              style={{ width: '100%', height: 600, border: 'none' }}
              title="PDF viewer"
            />
          </div>
        )}

        {contentType === 'download' && contentUrl && (
          <div style={{ background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📥</div>
            <p style={{ color: 'var(--si-dark-text)', fontFamily: 'DM Sans, sans-serif', marginBottom: '1.25rem' }}>
              Your file is ready to download.
            </p>
            <a
              href={contentUrl}
              download
              className="btn-primary"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
              onClick={markComplete}
            >
              Download file
            </a>
          </div>
        )}

        {contentType === 'text' && contentUrl && (
          <div style={{ background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: '1.5rem', color: 'var(--si-dark-text)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.8 }}>
            <div dangerouslySetInnerHTML={{ __html: contentUrl }} />
          </div>
        )}
        {contentType === 'text' && !contentUrl && !hasBlocks && (
          <div style={{ background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: '1.5rem', color: 'var(--si-dark-text)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.8 }}>
            <p style={{ color: 'var(--si-muted)' }}>Content coming soon.</p>
          </div>
        )}

        {!contentUrl && contentType !== 'text' && !hasBlocks && (
          <div style={{ background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>Content coming soon.</p>
          </div>
        )}

        {/* For video lessons, the description sits below the video */}
        {contentType === 'video' && description && (
          <p style={{ color: 'var(--si-muted)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '1.5rem', marginBottom: 0 }}>
            {description}
          </p>
        )}
      </div>

      {/* Content elements (buttons, images, bullets, etc.) rendered below the media */}
      {children}

      {/* Mark complete button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--si-border)' }}>
        {completed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--si-burnt-orange)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.9375rem' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--si-burnt-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem' }}>✓</span>
            Lesson complete
          </div>
        ) : (
          <button
            className="btn-primary"
            onClick={markComplete}
            disabled={marking}
          >
            {marking ? 'Saving…' : 'Mark as complete'}
          </button>
        )}
      </div>
    </div>
  )
}
