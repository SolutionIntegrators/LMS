// Community discussion board — access check + notification fan-out.
//
// Access model: a course-level subscription (community_subscriptions,
// subscribed=true by default, created on purchase — see lib/grant.ts) plus a
// per-thread mute (community_thread_mutes). Recipients for a thread/reply =
// subscribed && not muted-for-this-thread && still within the product's
// community_access_months window (from user_product_access.granted_at) &&
// not the actor themselves. All sends are best-effort — a Resend failure must
// never block posting.

import { createServiceSupabaseClient } from './supabase-service'
import {
  sendCommunityNewThreadAdminEmail,
  sendCommunityActivityEmail,
} from './email'

type Recipient = { id: string; email: string; full_name: string | null }

// The (first) lesson that renders this product's community board — used to
// build links in notification emails. Null if the product has none.
export async function getCommunityLessonId(db: ReturnType<typeof createServiceSupabaseClient>, productId: string): Promise<string | null> {
  const { data } = await (db as any)
    .from('lessons')
    .select('id, sort_order, modules!inner(product_id)')
    .eq('modules.product_id', productId)
    .eq('content_type', 'community')
    .order('sort_order', { ascending: true })
    .limit(1)
  return data?.[0]?.id ?? null
}

export function communityUrl(origin: string, lessonId: string, threadId?: string): string {
  return threadId ? `${origin}/lessons/${lessonId}?thread=${threadId}` : `${origin}/lessons/${lessonId}`
}

// Course-subscribed user ids whose access is still within the product's
// community_access_months window (from user_product_access.granted_at).
async function getActiveSubscribedIds(db: ReturnType<typeof createServiceSupabaseClient>, productId: string): Promise<string[]> {
  const anyDb = db as any

  const { data: product } = await anyDb.from('products').select('community_access_months').eq('id', productId).single()
  const months = product?.community_access_months ?? 6

  const { data: subs } = await anyDb
    .from('community_subscriptions')
    .select('user_id')
    .eq('product_id', productId)
    .eq('subscribed', true)
  const subscribedIds = (subs ?? []).map((s: any) => s.user_id)
  if (subscribedIds.length === 0) return []

  const { data: access } = await anyDb
    .from('user_product_access')
    .select('user_id, granted_at')
    .eq('product_id', productId)
    .in('user_id', subscribedIds)
  const now = Date.now()
  return (access ?? [])
    .filter((a: any) => {
      // Calendar-month arithmetic, matching has_active_community_access()'s
      // Postgres interval math (not a flat 30-day approximation).
      const expiry = new Date(a.granted_at)
      expiry.setMonth(expiry.getMonth() + months)
      return expiry.getTime() > now
    })
    .map((a: any) => a.user_id)
}

// Course-subscribed, non-expired, non-muted-for-this-thread recipients,
// excluding one user (the actor who just posted). Used for thread/reply alerts.
async function getRecipients(
  db: ReturnType<typeof createServiceSupabaseClient>,
  productId: string,
  opts: { excludeUserId: string; threadId?: string }
): Promise<Recipient[]> {
  const anyDb = db as any
  const activeIds = (await getActiveSubscribedIds(db, productId)).filter((id) => id !== opts.excludeUserId)
  if (activeIds.length === 0) return []

  let mutedIds = new Set<string>()
  if (opts.threadId) {
    const { data: mutes } = await anyDb.from('community_thread_mutes').select('user_id').eq('thread_id', opts.threadId)
    mutedIds = new Set((mutes ?? []).map((m: any) => m.user_id))
  }
  const finalIds = activeIds.filter((id) => !mutedIds.has(id))
  if (finalIds.length === 0) return []

  const { data: profiles } = await anyDb.from('profiles').select('id, email, full_name').in('id', finalIds)
  return (profiles ?? []).filter((p: Recipient) => p.email)
}

// Course-subscribed, non-expired recipients for the weekly digest (mute is
// per-thread and doesn't apply to the course-wide digest).
export async function getDigestRecipients(db: ReturnType<typeof createServiceSupabaseClient>, productId: string): Promise<Recipient[]> {
  const anyDb = db as any
  const activeIds = await getActiveSubscribedIds(db, productId)
  if (activeIds.length === 0) return []
  const { data: profiles } = await anyDb.from('profiles').select('id, email, full_name').in('id', activeIds)
  return (profiles ?? []).filter((p: Recipient) => p.email)
}

function excerpt(body: string, len = 160): string {
  const plain = body.replace(/\s+/g, ' ').trim()
  return plain.length > len ? `${plain.slice(0, len)}…` : plain
}

// Fired after a new thread is inserted. Admin always gets one; course-
// subscribed students get one (best-effort, never throws).
export async function notifyNewThread(opts: {
  productId: string
  productTitle: string
  threadId: string
  threadTitle: string
  threadBody: string
  authorUserId: string
  authorLabel: string
  origin: string
}): Promise<void> {
  try {
    const db = createServiceSupabaseClient()
    const lessonId = await getCommunityLessonId(db, opts.productId)
    if (!lessonId) return
    const url = communityUrl(opts.origin, lessonId, opts.threadId)

    await sendCommunityNewThreadAdminEmail({
      productTitle: opts.productTitle, threadTitle: opts.threadTitle, authorLabel: opts.authorLabel, threadUrl: url,
    })

    const recipients = await getRecipients(db, opts.productId, { excludeUserId: opts.authorUserId })
    for (const r of recipients) {
      await sendCommunityActivityEmail({
        to: r.email, fullName: r.full_name, productTitle: opts.productTitle, threadTitle: opts.threadTitle,
        kind: 'thread', authorLabel: opts.authorLabel, excerpt: excerpt(opts.threadBody), threadUrl: url,
      })
    }
  } catch (err) {
    console.error('notifyNewThread failed:', err instanceof Error ? err.message : err)
  }
}

// Fired after a new reply is inserted. No admin email (per spec — admin is
// only notified on new threads); course-subscribed, non-muted students only.
export async function notifyNewReply(opts: {
  productId: string
  productTitle: string
  threadId: string
  threadTitle: string
  replyBody: string
  authorUserId: string
  authorLabel: string
  origin: string
}): Promise<void> {
  try {
    const db = createServiceSupabaseClient()
    const lessonId = await getCommunityLessonId(db, opts.productId)
    if (!lessonId) return
    const url = communityUrl(opts.origin, lessonId, opts.threadId)

    const recipients = await getRecipients(db, opts.productId, { excludeUserId: opts.authorUserId, threadId: opts.threadId })
    for (const r of recipients) {
      await sendCommunityActivityEmail({
        to: r.email, fullName: r.full_name, productTitle: opts.productTitle, threadTitle: opts.threadTitle,
        kind: 'reply', authorLabel: opts.authorLabel, excerpt: excerpt(opts.replyBody), threadUrl: url,
      })
    }
  } catch (err) {
    console.error('notifyNewReply failed:', err instanceof Error ? err.message : err)
  }
}
