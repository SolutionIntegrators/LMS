export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { syncSupportTicketFromClickUp } from '@/lib/support-sync'

// Auth: a ClickUp Automation ("when status changes → Send Webhook") posts here
// with a custom header carrying a shared secret — same pattern as
// /api/webhooks/zapier's x-api-key check.
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CLICKUP_WEBHOOK_SECRET
  if (!secret) return new Response('CLICKUP_WEBHOOK_SECRET not configured', { status: 503 })
  if (request.headers.get('x-webhook-secret') !== secret) return new Response('Unauthorized', { status: 401 })

  const url = new URL(request.url)
  const rawBody = await request.text()
  let payload: any = {}
  if (rawBody) { try { payload = JSON.parse(rawBody) } catch { /* the Automation action may send no body at all */ } }

  // Only task_id needs to survive the trip through the webhook — status,
  // Resolution, and Additional Info Needed are always re-fetched live from
  // ClickUp below, since a ClickUp Automation's "Send Webhook" action has no
  // reliable way to attach a live status value to its payload/URL params.
  const taskId: string | undefined =
    payload.task_id ?? payload.taskId ?? payload.id ?? url.searchParams.get('task_id') ?? undefined
  if (!taskId) return new Response('Missing task_id', { status: 400 })

  const db = createServiceSupabaseClient() as any
  const { data: ticket } = await db.from('support_requests').select('*').eq('clickup_task_id', taskId).maybeSingle()
  if (!ticket) return Response.json({ ok: true, note: 'No matching ticket for this task' })

  await syncSupportTicketFromClickUp(db, ticket, url.origin)

  return Response.json({ ok: true })
}
