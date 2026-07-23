export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { getClickUpResolution, CLIENT_VISIBLE_STATUSES } from '@/lib/clickup'
import { sendSupportResolvedEmail } from '@/lib/email'

// ClickUp signs webhook payloads with an HMAC-SHA256 of the raw body, using
// the `secret` returned when the webhook was registered (POST
// /team/{team_id}/webhook) — sent back as the `X-Signature` header. Verify
// with the Web Crypto API (Node's `crypto` module isn't available on edge).
async function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader) return false
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === signatureHeader
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CLICKUP_WEBHOOK_SECRET
  if (!secret) return new Response('CLICKUP_WEBHOOK_SECRET not configured', { status: 503 })

  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')
  if (!(await verifySignature(rawBody, signature, secret))) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: any = {}
  try { payload = JSON.parse(rawBody) } catch { return new Response('Bad payload', { status: 400 }) }

  // Defensive parsing (ClickUp's exact shape can vary by event) — mirrors
  // the tolerant style already used in /api/webhooks/zapier.
  const taskId: string | undefined = payload.task_id ?? payload.taskId
  if (!taskId) return new Response('Missing task_id', { status: 400 })

  const newStatusRaw = payload.history_items?.[0]?.after?.status ?? payload.status ?? null
  const newStatus = typeof newStatusRaw === 'string' ? newStatusRaw.toLowerCase().trim() : null

  const db = createServiceSupabaseClient() as any
  const { data: ticket } = await db.from('support_requests').select('*').eq('clickup_task_id', taskId).maybeSingle()
  if (!ticket) return Response.json({ ok: true, note: 'No matching ticket for this task' })

  const wasClientVisibleResolved = ticket.client_visible_status === 'resolved'

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (newStatus) {
    update.internal_status = newStatus
    // Only advance client_visible_status on one of the 5 client-facing
    // statuses; internal-only statuses (e.g. "triaged") never reach the student.
    if ((CLIENT_VISIBLE_STATUSES as readonly string[]).includes(newStatus)) {
      update.client_visible_status = newStatus
    }
  }

  // Best-effort: refresh the Resolution custom field on every status change.
  const resolution = await getClickUpResolution(taskId)
  if (resolution !== null) update.resolution = resolution

  await db.from('support_requests').update(update).eq('id', ticket.id)

  // Resolved transition (not already resolved, not already notified) → email
  // the student. Send even if Resolution is still empty at this instant —
  // /api/cron/support-sync backfills it later if it fills in shortly after.
  const justBecameResolved = update.client_visible_status === 'resolved' && !wasClientVisibleResolved && !ticket.resolved_notified_at
  if (justBecameResolved) {
    try {
      const { data: profile } = await db.from('profiles').select('email, full_name').eq('id', ticket.user_id).single()
      if (profile?.email) {
        await sendSupportResolvedEmail({
          to: profile.email,
          fullName: profile.full_name,
          subject: ticket.subject,
          resolution: (update.resolution ?? ticket.resolution) || null,
        })
      }
      await db.from('support_requests').update({ resolved_notified_at: new Date().toISOString() }).eq('id', ticket.id)
    } catch (err) {
      console.error('sendSupportResolvedEmail failed:', err instanceof Error ? err.message : err)
    }
  }

  return Response.json({ ok: true })
}
