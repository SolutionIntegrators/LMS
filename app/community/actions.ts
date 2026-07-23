'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { notifyNewThread, notifyNewReply } from '@/lib/community'

async function requireUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await (supabase as any).from('profiles').select('full_name, email').eq('id', user.id).single()
  return { supabase, user, profile }
}

// community_threads/community_replies reference auth.users, not public.profiles,
// so PostgREST can't embed profiles(...) directly — resolve display names via a
// separate, service-role-backed lookup instead (profiles RLS only allows a user
// to read their own row, so this can't go through the session-scoped client).
async function getAuthorNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return new Map()
  const db = createServiceSupabaseClient() as any
  const { data } = await db.from('profiles').select('id, full_name, email').in('id', ids)
  const map = new Map<string, string>()
  for (const p of data ?? []) map.set(p.id, p.full_name || p.email || 'Someone')
  return map
}

// RLS denies the insert outright if community access has expired/never
// existed — surface that as a friendly message instead of a raw PG error.
function friendlyInsertError(error: { message: string; code?: string }): Error {
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    return new Error('Your access to this community may have expired.')
  }
  return new Error(error.message)
}

export async function getThreadList(productId: string) {
  const { supabase } = await requireUser()
  const { data, error } = await (supabase as any)
    .from('community_threads')
    .select('id, title, is_pinned, created_at, updated_at, author_user_id, community_replies(count)')
    .eq('product_id', productId)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)

  const authors = await getAuthorNames((data ?? []).map((t: any) => t.author_user_id))

  return (data ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    isPinned: t.is_pinned,
    createdAt: t.created_at,
    lastActivity: t.updated_at,
    authorName: authors.get(t.author_user_id) || 'Someone',
    replyCount: t.community_replies?.[0]?.count ?? 0,
  }))
}

export async function getThreadDetail(threadId: string) {
  const { supabase, user } = await requireUser()

  const { data: thread, error } = await (supabase as any)
    .from('community_threads')
    .select('id, title, body, created_at, product_id, author_user_id')
    .eq('id', threadId)
    .single()
  if (error || !thread) throw new Error(error?.message || 'Thread not found')

  const { data: replies } = await (supabase as any)
    .from('community_replies')
    .select('id, body, created_at, author_user_id')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  const { data: mute } = await (supabase as any)
    .from('community_thread_mutes')
    .select('id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .maybeSingle()

  const authors = await getAuthorNames([thread.author_user_id, ...(replies ?? []).map((r: any) => r.author_user_id)])

  return {
    id: thread.id,
    title: thread.title,
    body: thread.body,
    createdAt: thread.created_at,
    productId: thread.product_id,
    authorName: authors.get(thread.author_user_id) || 'Someone',
    isMuted: !!mute,
    replies: (replies ?? []).map((r: any) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      authorName: authors.get(r.author_user_id) || 'Someone',
    })),
  }
}

export async function createThread(formData: FormData) {
  const { supabase, user, profile } = await requireUser()
  const productId = formData.get('product_id') as string
  const lessonSlugForRevalidate = (formData.get('lesson_id') as string) || ''
  const title = ((formData.get('title') as string) || '').trim()
  const body = ((formData.get('body') as string) || '').trim()
  if (!title || !body) throw new Error('Title and body are required')

  const { data: thread, error } = await (supabase as any)
    .from('community_threads')
    .insert({ product_id: productId, author_user_id: user.id, title, body })
    .select('id')
    .single()
  if (error) throw friendlyInsertError(error)

  const { data: product } = await (supabase as any).from('products').select('title').eq('id', productId).single()
  const origin = new URL((formData.get('origin') as string) || 'http://localhost').origin

  await notifyNewThread({
    productId, productTitle: product?.title || 'the course', threadId: thread.id,
    threadTitle: title, threadBody: body, authorUserId: user.id,
    authorLabel: profile?.full_name || profile?.email || 'A student', origin,
  })

  if (lessonSlugForRevalidate) revalidatePath(`/lessons/${lessonSlugForRevalidate}`)
  return { threadId: thread.id as string }
}

export async function createReply(formData: FormData) {
  const { supabase, user, profile } = await requireUser()
  const threadId = formData.get('thread_id') as string
  const lessonSlugForRevalidate = (formData.get('lesson_id') as string) || ''
  const body = ((formData.get('body') as string) || '').trim()
  if (!body) throw new Error('Reply cannot be empty')

  const { data: thread } = await (supabase as any)
    .from('community_threads')
    .select('id, title, product_id, products(title)')
    .eq('id', threadId)
    .single()
  if (!thread) throw new Error('Thread not found')

  const { error } = await (supabase as any)
    .from('community_replies')
    .insert({ thread_id: threadId, author_user_id: user.id, body })
  if (error) throw friendlyInsertError(error)

  // Touch the parent thread so "last activity" sort reflects this reply.
  await (supabase as any).from('community_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)

  const origin = new URL((formData.get('origin') as string) || 'http://localhost').origin
  await notifyNewReply({
    productId: thread.product_id, productTitle: thread.products?.title || 'the course',
    threadId, threadTitle: thread.title, replyBody: body, authorUserId: user.id,
    authorLabel: profile?.full_name || profile?.email || 'A student', origin,
  })

  if (lessonSlugForRevalidate) revalidatePath(`/lessons/${lessonSlugForRevalidate}`)
}

export async function toggleThreadMute(formData: FormData) {
  const { supabase, user } = await requireUser()
  const threadId = formData.get('thread_id') as string
  const mute = formData.get('mute') === 'true'

  if (mute) {
    await (supabase as any).from('community_thread_mutes').upsert(
      { user_id: user.id, thread_id: threadId }, { onConflict: 'user_id,thread_id', ignoreDuplicates: true }
    )
  } else {
    await (supabase as any).from('community_thread_mutes').delete().eq('user_id', user.id).eq('thread_id', threadId)
  }
}
