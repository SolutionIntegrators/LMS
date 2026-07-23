export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { createClickUpTask, getClickUpResolution } from '@/lib/clickup'

// Two best-effort backstops for support ticketing, run on a schedule like the
// other /api/cron/* endpoints: GET ?key=CRON_SECRET
//
// 1. Retry ClickUp task creation for tickets whose submission-time call
//    failed (clickup_task_id still null).
// 2. Backfill the Resolution field for already-resolved tickets that still
//    have none — covers a Resolution filled in on ClickUp shortly after the
//    "resolved" webhook fired (the student already got their email either way).
export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = createServiceSupabaseClient() as any
  let tasksCreated = 0
  let resolutionsBackfilled = 0

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

  const { data: unresolved } = await db
    .from('support_requests')
    .select('id, clickup_task_id')
    .eq('client_visible_status', 'resolved')
    .is('resolution', null)
    .not('clickup_task_id', 'is', null)

  for (const ticket of unresolved ?? []) {
    const resolution = await getClickUpResolution(ticket.clickup_task_id)
    if (resolution) {
      await db.from('support_requests').update({ resolution }).eq('id', ticket.id)
      resolutionsBackfilled += 1
    }
  }

  return Response.json({ ok: true, tasksCreated, resolutionsBackfilled })
}
