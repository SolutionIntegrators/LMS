export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { updateSiteSettings } from '../content/actions'

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

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: settings } = await (supabase as any)
    .from('site_settings')
    .select('key, value')

  const settingsMap = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
  const announcementActive = settingsMap['announcement_active'] === 'true'
  const announcementText = settingsMap['announcement_text'] ?? ''
  const welcomeVideoUrl = settingsMap['welcome_video_url'] ?? ''

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)', marginBottom: '1.75rem' }}>
        Settings
      </h1>

      {/* Announcement Bar */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-denim-blue)', marginBottom: '1.25rem' }}>
          Announcement Bar
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Shown at the top of the dashboard for all logged-in students.
        </p>
        <form action={updateSiteSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', color: 'var(--si-dark-text)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="announcement_active"
              defaultChecked={announcementActive}
              style={{ width: 16, height: 16, accentColor: 'var(--si-burnt-orange)' }}
            />
            Show announcement bar
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>
              Announcement text
            </span>
            <textarea
              name="announcement_text"
              defaultValue={announcementText}
              rows={3}
              placeholder="e.g. 🎉 New content just dropped! Check out Module 3 in your Dubsado DIY program."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <div style={{ borderTop: '1px solid var(--si-border)', paddingTop: '1.25rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: 'var(--si-denim-blue)' }}>
                Welcome video (dashboard)
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', color: 'var(--si-muted)', marginBottom: '0.25rem' }}>
                Paste the video <b>embed/player URL</b> (the <code>src</code> from the embed code, e.g. a Bunny/Loom/Vimeo player link). Shows at the top of every student&apos;s dashboard. Leave blank to hide.
              </span>
              <input
                name="welcome_video_url"
                defaultValue={welcomeVideoUrl}
                placeholder="https://player.mediadelivery.net/embed/…"
                style={inputStyle}
              />
            </label>
          </div>

          <div>
            <button type="submit" className="btn-primary" style={{ fontSize: '0.875rem' }}>
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
