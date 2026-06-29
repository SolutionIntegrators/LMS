'use client'

import { useActionState } from 'react'
import { updateProduct } from '../actions'

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  fontFamily: 'DM Sans, sans-serif',
  width: '100%',
}

type State = { ok: boolean; error: string | null } | null

async function saveAction(_prev: State, formData: FormData): Promise<State> {
  try {
    await updateProduct(formData)
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to save product' }
  }
}

export default function ProductSettingsForm({ product }: { product: any }) {
  const [state, formAction, pending] = useActionState(saveAction, null)

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <input type="hidden" name="id" value={product.id} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Title</span>
          <input name="title" defaultValue={product.title} required style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>ThriveCart Product ID</span>
          <input name="thrivecart_product_id" defaultValue={product.thrivecart_product_id ?? ''} style={inputStyle} />
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Description</span>
        <textarea name="description" defaultValue={product.description ?? ''} rows={2}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </label>

      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-muted)' }}>
        Product URL: <code style={{ background: 'var(--si-linen)', padding: '0.15rem 0.4rem', borderRadius: 3, fontSize: '0.8rem' }}>/products/{product.slug}</code>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', maxWidth: 480, alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Thumbnail URL (optional)</span>
          <input name="thumbnail_url" defaultValue={product.thumbnail_url ?? ''} placeholder="https://…/image.jpg" style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Or color</span>
          <input type="color" name="thumbnail_color" defaultValue={product.thumbnail_color ?? '#2C4A7C'}
            style={{ height: 38, width: 60, padding: '0.1rem 0.25rem', border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', cursor: 'pointer', background: 'var(--si-white)' }} />
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxWidth: 480 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>
          Auto-grant tags on purchase (comma-separated)
        </span>
        <input name="auto_grant_tags" defaultValue={(product.auto_grant_tags ?? []).join(', ')}
          placeholder="e.g. proposal_bundle, vip" style={inputStyle} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>
          Tags auto-added to buyer&apos;s profile when this ThriveCart product is purchased.
        </span>
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.25rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-dark-text)', cursor: 'pointer' }}>
          <input type="hidden" name="is_active" value="false" />
          <input type="checkbox" name="is_active" value="true" defaultChecked={product.is_active ?? false}
            style={{ width: 16, height: 16, accentColor: 'var(--si-burnt-orange)' }} />
          Active (visible to students)
        </label>
        <button type="submit" disabled={pending} className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
          {pending ? 'Saving…' : 'Save'}
        </button>
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
  )
}
