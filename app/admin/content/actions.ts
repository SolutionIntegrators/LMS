'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

async function getAdminClient() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Products ──────────────────────────────────────────────

export async function createProduct(formData: FormData) {
  const db = await getAdminClient()
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const thrivecart_product_id = (formData.get('thrivecart_product_id') as string) || null
  const slug = toSlug(title)

  const { error } = await db.from('products').insert({ title, slug, description, thrivecart_product_id, is_active: false })
  if (error) throw new Error(error.message)
}

export async function updateProduct(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const thrivecart_product_id = (formData.get('thrivecart_product_id') as string) || null
  const is_active = formData.getAll('is_active').includes('true')
  const thumbnail_url = (formData.get('thumbnail_url') as string) || null
  const thumbnail_color = (formData.get('thumbnail_color') as string) || null
  const auto_grant_tags = ((formData.get('auto_grant_tags') as string) || '')
    .split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)

  const { error } = await (db.from('products') as any).update({
    title, description, thrivecart_product_id, is_active, thumbnail_url, thumbnail_color, auto_grant_tags,
  }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProduct(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await db.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Modules ───────────────────────────────────────────────

export async function createModule(formData: FormData) {
  const db = await getAdminClient()
  const product_id = formData.get('product_id') as string
  const title = formData.get('title') as string

  const { data: existing } = await db.from('modules').select('sort_order').eq('product_id', product_id).order('sort_order', { ascending: false }).limit(1)
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await db.from('modules').insert({ product_id, title, sort_order })
  if (error) throw new Error(error.message)
}

export async function updateModule(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const thumbnail_url = (formData.get('thumbnail_url') as string) || null
  const thumbnail_color = (formData.get('thumbnail_color') as string) || null

  const { error } = await (db.from('modules') as any).update({ title, thumbnail_url, thumbnail_color }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteModule(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await db.from('modules').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function reorderModule(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const direction = formData.get('direction') as 'up' | 'down'
  const product_id = formData.get('product_id') as string

  const { data: modules } = await db.from('modules').select('id, sort_order').eq('product_id', product_id).order('sort_order')
  if (!modules) return

  const idx = modules.findIndex((m) => m.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= modules.length) return

  const a = modules[idx]
  const b = modules[swapIdx]
  await db.from('modules').update({ sort_order: b.sort_order }).eq('id', a.id)
  await db.from('modules').update({ sort_order: a.sort_order }).eq('id', b.id)
}

// ── Lessons ───────────────────────────────────────────────

export async function createLesson(formData: FormData): Promise<{ lessonId: string }> {
  const db = await getAdminClient()
  const module_id = formData.get('module_id') as string
  const title = formData.get('title') as string

  const { data: existing } = await db.from('lessons').select('sort_order').eq('module_id', module_id).order('sort_order', { ascending: false }).limit(1)
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await db.from('lessons').insert({ module_id, title, sort_order, is_published: false }).select('id').single()
  if (error) throw new Error(error.message)
  return { lessonId: data.id }
}

export async function updateLesson(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const content_type = (formData.get('content_type') as string) || null
  const content_url = (formData.get('content_url') as string) || null
  const is_published = formData.get('is_published') === 'on'
  const required_tag = (formData.get('required_tag') as string) || null

  const { error } = await (db.from('lessons') as any).update({
    title, description, content_type, content_url, is_published, required_tag,
  }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteLesson(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await db.from('lessons').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function reorderLesson(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const direction = formData.get('direction') as 'up' | 'down'
  const module_id = formData.get('module_id') as string

  const { data: lessons } = await db.from('lessons').select('id, sort_order').eq('module_id', module_id).order('sort_order')
  if (!lessons) return

  const idx = lessons.findIndex((l) => l.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= lessons.length) return

  const a = lessons[idx]
  const b = lessons[swapIdx]
  await db.from('lessons').update({ sort_order: b.sort_order }).eq('id', a.id)
  await db.from('lessons').update({ sort_order: a.sort_order }).eq('id', b.id)
}

// ── Site Settings ─────────────────────────────────────────────────────────────

export async function updateSiteSettings(formData: FormData) {
  const db = await getAdminClient()
  const announcement_active = formData.get('announcement_active') === 'on' ? 'true' : 'false'
  const announcement_text = (formData.get('announcement_text') as string) || ''

  await (db as any).from('site_settings').upsert({ key: 'announcement_active', value: announcement_active, updated_at: new Date().toISOString() })
  await (db as any).from('site_settings').upsert({ key: 'announcement_text', value: announcement_text, updated_at: new Date().toISOString() })
}

// ── User Tags ─────────────────────────────────────────────────────────────────

export async function updateUserTags(formData: FormData) {
  const db = await getAdminClient()
  const userId = formData.get('user_id') as string
  const tagsRaw = (formData.get('tags') as string) || ''
  const tags = tagsRaw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)

  const { error } = await (db.from('profiles') as any).update({ tags }).eq('id', userId)
  if (error) throw new Error(error.message)
}
