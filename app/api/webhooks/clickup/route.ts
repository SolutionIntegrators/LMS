export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { getClickUpResolution, CLIENT_VISIBLE_STATUSES } from '@/lib/clickup'
import { sendSupportResolvedEmail } from '@/lib/email'

// Auth: a ClickUp Automation ("when status changes → Send Webhook") posts here
// with a custom header carrying a shared secret — same pattern as
// /api/webhooks/zapier's x-api-key check.
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CLICKUP_WEBHOOK_SECRET
  if (!secret) return new Response('CLICKUP_WEBHOOK_SECRET not configured', { status: 503 })
  if (request.headers.get('x-webhook-secret') !== secret) return new Response('Unauthorized', { status: 401 })

  const rawBody = await request.text()
  let payload: any = {}
  try { payload = JSON.parse(rawBody) } catch { return new Response('Bad payload', { status: 400 }) }

  // Defensive parsing — a native ClickUp webhook sends a history-item diff
  // (`history_items[0].after.status`), while an Automation "Send Webhook"
  // action sends the task's current fields instead (`status.status`, or a
  // plain `status` string). Accept whichever shape shows up.
  const taskId: string | undefined = payload.task_id ?? payload.taskId ?? payload.id
  if (!taskId) return new Response('Missing task_id', { status: 400 })

  const newStatusRaw =
    payload.history_items?.[0]?.after?.status ??
    payload.status?.status ??
    payload.status ??
    null
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
