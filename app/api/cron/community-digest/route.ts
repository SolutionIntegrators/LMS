export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { getCommunityLessonId, getDigestRecipients, communityUrl } from '@/lib/community'
import { sendCommunityDigestEmail } from '@/lib/email'

// Weekly "This Week in the Community" digest — one email per subscribed,
// non-expired student per course that had activity in the last 7 days.
// Schedule (like the other crons): GET /api/cron/community-digest?key=CRON_SECRET
//
// "Activity" = threads created in the last 7 days, OR older threads that got a
// new reply in the last 7 days. Products with no activity are skipped entirely
// (no email sent). Batched per-product to stay well within the edge runtime's
// execution limits even as the number of courses/subscribers grows.
export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = createServiceSupabaseClient() as any
  const origin = new URL(request.url).origin
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Every product that has at least one community-type lesson.
  const { data: communityLessons } = await db
    .from('lessons')
    .select('modules!inner(product_id)')
    .eq('content_type', 'community')
  const productIds = [...new Set((communityLessons ?? []).map((l: any) => l.modules?.product_id).filter(Boolean))] as string[]

  const summary: Array<{ productId: string; threadsIncluded: number; emailsSent: number }> = []

  for (const productId of productIds) {
    const { data: product } = await db.from('products').select('title').eq('id', productId).single()
    const lessonId = await getCommunityLessonId(db, productId)
    if (!lessonId) continue

    // Every thread for this product with its replies' created_at (plain rows,
    // not the aggregate `count` embed — mixing count with real columns in one
    // embedded select isn't reliable in PostgREST). Reply count = array length.
    const { data: allThreads } = await db
      .from('community_threads')
      .select('id, title, created_at, community_replies(created_at)')
      .eq('product_id', productId)

    const active = (allThreads ?? []).filter((t: any) => {
      const isNewThread = t.created_at >= cutoff
      const hasRecentReply = (t.community_replies ?? []).some((r: any) => r.created_at >= cutoff)
      return isNewThread || hasRecentReply
    })
    if (active.length === 0) continue

    const newThreads = active.map((t: any) => ({
      title: t.title,
      replyCount: Array.isArray(t.community_replies) ? t.community_replies.length : 0,
      url: communityUrl(origin, lessonId, t.id),
    }))

    const recipients = await getDigestRecipients(db, productId)
    let emailsSent = 0
    for (const r of recipients) {
      await sendCommunityDigestEmail({
        to: r.email, fullName: r.full_name, productTitle: product?.title || 'your course',
        newThreads, communityUrl: communityUrl(origin, lessonId),
      })
      emailsSent += 1
    }
    summary.push({ productId, threadsIncluded: active.length, emailsSent })
  }

  return Response.json({ ok: true, products: summary })
}
