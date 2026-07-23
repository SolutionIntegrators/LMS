'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { createClickUpTask } from '@/lib/clickup'

async function requireUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  return { supabase, user }
}

// Safe field whitelist for the student's own view — internal_status,
// clickup_task_id, and clickup_list_id are never returned here (students
// never see ClickUp's internal-only statuses or task ids).
export async function getMyRequests() {
  const { supabase, user } = await requireUser()
  const { data, error } = await (supabase as any)
    .from('support_requests')
    .select('id, subject, description, product_slug, client_visible_status, resolution, additional_info_needed, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

// Products the student owns, for the optional "which course?" dropdown.
export async function getMyProducts() {
  const { supabase, user } = await requireUser()
  const { data: access } = await supabase.from('user_product_access').select('product_id').eq('user_id', user.id)
  const productIds = (access ?? []).map((a) => a.product_id).filter((id): id is string => id !== null)
  if (productIds.length === 0) return []
  const { data } = await supabase.from('products').select('slug, title').in('id', productIds).order('title')
  return data ?? []
}

export async function submitTicket(formData: FormData) {
  const { supabase, user } = await requireUser()
  const subject = ((formData.get('subject') as string) || '').trim()
  const description = ((formData.get('description') as string) || '').trim()
  const productSlug = ((formData.get('product_slug') as string) || '').trim() || null
  if (!subject || !description) throw new Error('Subject and description are required')

  const { data: profile } = await (supabase as any).from('profiles').select('email, full_name').eq('id', user.id).single()
  const email = profile?.email || user.email || ''

  let productTitle: string | null = null
  if (productSlug) {
    const { data: product } = await supabase.from('products').select('title').eq('slug', productSlug).maybeSingle()
    productTitle = product?.title ?? null
  }

  // Submission (and the follow-up update once ClickUp's task id comes back)
  // goes through the service-role client — students have no update-own RLS
  // policy on this table (see 0016_support_requests.sql), matching how
  // lib/grant.ts runs its whole purchase pipeline as service-role.
  const db = createServiceSupabaseClient() as any
  const { data: row, error } = await db.from('support_requests').insert({
    user_id: user.id, subject, description, product_slug: productSlug,
    internal_status: 'new tickets', client_visible_status: 'new tickets',
  }).select('id').single()
  if (error) throw new Error(error.message)

  // Best-effort: create the matching ClickUp task. Never blocks the
  // student's submission — a ClickUp outage just leaves clickup_task_id
  // null, and /api/cron/support-sync retries it.
  try {
    const task = await createClickUpTask({ subject, description, email, productTitle })
    if (task) {
      await db.from('support_requests').update({
        clickup_task_id: task.taskId, clickup_list_id: task.listId,
      }).eq('id', row.id)
    }
  } catch (err) {
    console.error('createClickUpTask failed:', err instanceof Error ? err.message : err)
  }

  revalidatePath('/support')
  return { id: row.id as string }
}
