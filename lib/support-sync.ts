// Shared sync step used by both the ClickUp webhook (fast path) and the
// /api/cron/support-sync backstop (reliable path — a ClickUp Automation's
// "Send Webhook" action can't attach a live status to its payload, so the
// cron re-polls every open ticket directly against the ClickUp API). Keeping
// this in one place means both paths apply status/resolution/additional-info
// updates and the resolved-email transition identically.

import { createServiceSupabaseClient } from './supabase-service'
import { getClickUpTaskFields, CLIENT_VISIBLE_STATUSES } from './clickup'
import { sendSupportResolvedEmail } from './email'

type Db = ReturnType<typeof createServiceSupabaseClient>

export interface SupportTicketRow {
  id: string
  clickup_task_id: string
  user_id: string
  subject: string
  resolution: string | null
  client_visible_status: string | null
  resolved_notified_at: string | null
}

export async function syncSupportTicketFromClickUp(db: Db, ticket: SupportTicketRow): Promise<void> {
  const anyDb = db as any
  const wasClientVisibleResolved = ticket.client_visible_status === 'resolved'

  const fields = await getClickUpTaskFields(ticket.clickup_task_id)
  if (!fields) return

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (fields.status) {
    update.internal_status = fields.status
    // Only advance client_visible_status on one of the 5 client-facing
    // statuses; internal-only statuses (e.g. "triaged") never reach the student.
    if ((CLIENT_VISIBLE_STATUSES as readonly string[]).includes(fields.status)) {
      update.client_visible_status = fields.status
    }
  }
  if (fields.resolution !== null) update.resolution = fields.resolution
  update.additional_info_needed = fields.additionalInfoNeeded

  await anyDb.from('support_requests').update(update).eq('id', ticket.id)

  // Resolved transition (not already resolved, not already notified) → email
  // the student. Guarded so it only ever sends once per ticket.
  const justBecameResolved = update.client_visible_status === 'resolved' && !wasClientVisibleResolved && !ticket.resolved_notified_at
  if (justBecameResolved) {
    try {
      const { data: profile } = await anyDb.from('profiles').select('email, full_name').eq('id', ticket.user_id).single()
      if (profile?.email) {
        await sendSupportResolvedEmail({
          to: profile.email,
          fullName: profile.full_name,
          subject: ticket.subject,
          resolution: (update.resolution ?? ticket.resolution) || null,
        })
      }
      await anyDb.from('support_requests').update({ resolved_notified_at: new Date().toISOString() }).eq('id', ticket.id)
    } catch (err) {
      console.error('sendSupportResolvedEmail failed:', err instanceof Error ? err.message : err)
    }
  }
}
