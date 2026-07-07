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

export default function ProductSettingsForm({ product, kitTags = [] }: { product: any; kitTags?: { id: number; name: string }[] }) {
  const [state, formAction, pending] = useActionState(saveAction, null)

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="slug" value={product.slug} />

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Title</span>
        <input name="title" defaultValue={product.title} required style={inputStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxWidth: 320 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Category</span>
        <input name="category" defaultValue={product.category ?? ''} placeholder="e.g. Dubsado, Airtable…" style={inputStyle} />
      </label>

      {/* Kit (email marketing) tag applied to buyers of this product on purchase */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxWidth: 360 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Kit tag on purchase</span>
        {kitTags.length > 0 ? (
          <select name="kit_tag_id" defaultValue={product.kit_tag_id ?? ''} style={inputStyle}>
            <option value="">— None —</option>
            {kitTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <>
            <input name="kit_tag_id" defaultValue={product.kit_tag_id ?? ''} placeholder="Kit tag ID (Kit not connected)" style={inputStyle} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>
              Kit isn&apos;t connected, so paste a tag ID manually. Once connected, this becomes a dropdown of your tags.
            </span>
          </>
        )}
      </label>

      {/* Affiliate: sales-page URL. Setting it makes the product affiliate-eligible. */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxWidth: 480 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Sales page URL (for affiliate links)</span>
        <input name="sales_page_url" defaultValue={product.sales_page_url ?? ''} placeholder="https://solutionintegrators.us/shop/…" style={inputStyle} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>
          Where affiliate links for this product redirect. Filling this in makes the product available for partners to request a link.
        </span>
      </label>

      {/* Announcement bar — shows on this product's page for everyone who owns it */}
      <div style={{ border: '1px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.875rem 1rem', background: 'var(--si-linen)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--si-dark-text)', cursor: 'pointer' }}>
          <input type="hidden" name="announcement_active" value="false" />
          <input type="checkbox" name="announcement_active" value="true" defaultChecked={product.announcement_active ?? false}
            style={{ width: 16, height: 16, accentColor: 'var(--si-burnt-orange)' }} />
          Show an announcement bar on this product
        </label>
        <textarea name="announcement_text" defaultValue={product.announcement_text ?? ''} rows={2}
          placeholder="e.g. Dubsado 3.0 materials are coming in Q3 — you'll get them free as a current owner."
          style={{ ...inputStyle, resize: 'vertical' }} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>
          Only people who own this product will see it. Leave the box unchecked to hide without deleting the text.
        </span>
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
          Tags auto-added to the buyer&apos;s profile when this product is purchased.
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
