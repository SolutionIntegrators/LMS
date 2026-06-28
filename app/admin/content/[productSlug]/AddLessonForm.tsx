'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { createLesson } from '../actions'

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  fontFamily: 'DM Sans, sans-serif',
}

const btnSm: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.75rem',
  fontWeight: 500,
  padding: '0.25rem 0.625rem',
  borderRadius: 5,
  border: '1px solid var(--si-border)',
  background: 'var(--si-white)',
  color: 'var(--si-dark-text)',
  cursor: 'pointer',
}

export default function AddLessonForm({ moduleId, productSlug }: { moduleId: string; productSlug: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const { lessonId } = await createLesson(formData)
      router.push(`/admin/content/${productSlug}/lessons/${lessonId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
      <input type="hidden" name="module_id" value={moduleId} />
      <input name="title" required placeholder="New lesson title" style={{ ...inputStyle, fontSize: '0.85rem', flex: 1 }} disabled={pending} />
      <button type="submit" disabled={pending} style={{ ...btnSm, background: 'var(--si-denim-blue)', color: 'white', border: 'none' }}>
        {pending ? 'Adding…' : '+ Add Lesson'}
      </button>
    </form>
  )
}
