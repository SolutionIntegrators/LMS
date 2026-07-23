'use client'

import { useState } from 'react'
import AvatarUpload from './AvatarUpload'
import { updateProfile } from '@/app/profile/actions'

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

export default function ProfileForm({
  userId,
  fullName,
  email,
  avatarUrl,
}: {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
}) {
  const [name, setName] = useState(fullName)
  const [avatar, setAvatar] = useState(avatarUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const fd = new FormData()
      fd.set('full_name', name)
      fd.set('avatar_url', avatar ?? '')
      await updateProfile(fd)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <AvatarUpload userId={userId} currentUrl={avatar} onUploaded={setAvatar} />

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Email</span>
        <input value={email} disabled style={{ ...inputStyle, background: 'var(--si-linen)', color: 'var(--si-muted)' }} />
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {saved && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#1A6B3C' }}>Saved ✓</span>}
        {error && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#8B2A1A' }}>{error}</span>}
      </div>
    </form>
  )
}
