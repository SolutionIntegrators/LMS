// Kit (ConvertKit) v4 API — used to tag buyers in the email tool on purchase.
// Best-effort: any failure here must NOT block access granting.
// Auth via the X-Kit-Api-Key header (KIT_API_KEY). If unset, calls no-op.

const KIT_API = 'https://api.kit.com/v4'

function key() {
  return process.env.KIT_API_KEY
}

// Add a tag to a subscriber by email. Kit v4 won't create-on-tag (the tag
// endpoint 404s for an unknown subscriber), so we upsert the subscriber first
// (idempotent) then add the tag (idempotent). Best-effort throughout.
export async function tagSubscriber(tagId: number | string, email: string): Promise<void> {
  const k = key()
  if (!k || !tagId || !email) return
  const headers = { 'X-Kit-Api-Key': k, 'Content-Type': 'application/json' }
  try {
    // 1) Ensure the subscriber exists (returns the existing one if already there).
    const create = await fetch(`${KIT_API}/subscribers`, {
      method: 'POST', headers, body: JSON.stringify({ email_address: email }),
    })
    if (!create.ok) console.error('Kit create subscriber failed:', create.status, (await create.text()).slice(0, 200))
    // 2) Add the tag.
    const res = await fetch(`${KIT_API}/tags/${tagId}/subscribers`, {
      method: 'POST', headers, body: JSON.stringify({ email_address: email }),
    })
    if (!res.ok) console.error('Kit tagSubscriber failed:', res.status, (await res.text()).slice(0, 200))
  } catch (err) {
    console.error('Kit tagSubscriber error:', err instanceof Error ? err.message : err)
  }
}

// Enroll a subscriber into a sequence (by email). Ensures the subscriber exists
// first, then adds them. Idempotent — Kit won't re-enroll or restart someone
// already in the sequence. Best-effort.
export async function addSubscriberToSequence(sequenceId: number | string, email: string): Promise<void> {
  const k = key()
  if (!k || !sequenceId || !email) return
  const headers = { 'X-Kit-Api-Key': k, 'Content-Type': 'application/json' }
  try {
    await fetch(`${KIT_API}/subscribers`, { method: 'POST', headers, body: JSON.stringify({ email_address: email }) })
    const res = await fetch(`${KIT_API}/sequences/${sequenceId}/subscribers`, {
      method: 'POST', headers, body: JSON.stringify({ email_address: email }),
    })
    if (!res.ok) console.error('Kit addSubscriberToSequence failed:', res.status, (await res.text()).slice(0, 200))
  } catch (err) {
    console.error('Kit addSubscriberToSequence error:', err instanceof Error ? err.message : err)
  }
}

// Remove a tag from a subscriber (by email). Used to pull someone out of the
// "login nudge" flow once they've logged in. Best-effort; no-op if the
// subscriber or tag link doesn't exist.
export async function removeTagFromSubscriber(tagId: number | string, email: string): Promise<void> {
  const k = key()
  if (!k || !tagId || !email) return
  const headers = { 'X-Kit-Api-Key': k, 'Content-Type': 'application/json' }
  try {
    const q = new URL(`${KIT_API}/subscribers`)
    q.searchParams.set('email_address', email)
    const res = await fetch(q.toString(), { headers })
    if (!res.ok) return
    const data: any = await res.json()
    const sub = data.subscribers?.[0]
    if (!sub?.id) return
    await fetch(`${KIT_API}/tags/${tagId}/subscribers/${sub.id}`, { method: 'DELETE', headers })
  } catch (err) {
    console.error('Kit removeTagFromSubscriber error:', err instanceof Error ? err.message : err)
  }
}

export interface KitTag { id: number; name: string }

// List all tags (paginated) for the admin picker. Returns [] on any failure.
export async function listKitTags(): Promise<KitTag[]> {
  const k = key()
  if (!k) return []
  const tags: KitTag[] = []
  let after: string | null = null
  try {
    for (let i = 0; i < 20; i++) {
      const url = new URL(`${KIT_API}/tags`)
      url.searchParams.set('per_page', '100')
      if (after) url.searchParams.set('after', after)
      const res = await fetch(url.toString(), { headers: { 'X-Kit-Api-Key': k } })
      if (!res.ok) break
      const data: any = await res.json()
      for (const t of data.tags ?? []) tags.push({ id: t.id, name: t.name })
      if (!data.pagination?.has_next_page) break
      after = data.pagination.end_cursor
    }
  } catch (err) {
    console.error('Kit listKitTags error:', err instanceof Error ? err.message : err)
  }
  return tags.sort((a, b) => a.name.localeCompare(b.name))
}
