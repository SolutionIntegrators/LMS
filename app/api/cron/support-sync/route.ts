export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { createClickUpTask } from '@/lib/clickup'
import { syncSupportTicketFromClickUp } from '@/lib/support-sync'

// Two best-effort backstops for support ticketing, run on a schedule like the
// other /api/cron/* endpoints: GET ?key=CRON_SECRET
//
// 1. Retry ClickUp task creation for tickets whose submission-time call
//    failed (clickup_task_id still null).
// 2. Re-poll every open (non-resolved) ticket's live status/Resolution/
//    Additional Info Needed directly from ClickUp. This is the reliable path:
//    a ClickUp Automation's "Send Webhook" action has no dependable way to
//    attach a live status to its payload, so the webhook alone can miss
//    transitions — this cron catches up on whatever it missed.
export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const origin = new URL(request.url).origin
  const db = createServiceSupabaseClient() as any
  let tasksCreated = 0
  let ticketsSynced = 0

  const { data: unsynced } = await db
    .from('support_requests')
    .select('id, subject, description, product_slug, user_id')
    .is('clickup_task_id', null)

  for (const ticket of unsynced ?? []) {
    const { data: profile } = await db.from('profiles').select('email').eq('id', ticket.user_id).single()
    if (!profile?.email) continue

    let productTitle: string | null = null
    if (ticket.product_slug) {
      const { data: product } = await db.from('products').select('title').eq('slug', ticket.product_slug).maybeSingle()
      productTitle = product?.title ?? null
    }

    const task = await createClickUpTask({
      subject: ticket.subject, description: ticket.description, email: profile.email, productTitle,
    })
    if (task) {
      await db.from('support_requests').update({
        clickup_task_id: task.taskId, clickup_list_id: task.listId,
      }).eq('id', ticket.id)
      tasksCreated += 1
    }
  }

  const { data: open } = await db
    .from('support_requests')
    .select('id, clickup_task_id, user_id, subject, description, resolution, additional_info_needed, client_visible_status, resolved_notified_at')
    .neq('client_visible_status', 'resolved')
    .not('clickup_task_id', 'is', null)

  for (const ticket of open ?? []) {
    await syncSupportTicketFromClickUp(db, ticket, origin)
    ticketsSynced += 1
  }

  return Response.json({ ok: true, tasksCreated, ticketsSynced })
}
