'use server'

import { revalidatePath } from 'next/cache'
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
  const category = ((formData.get('category') as string) || '').trim() || null

  // Slug must be unique and non-empty: fall back for symbol-only titles and
  // suffix -2, -3… when the slug is already taken.
  const base = toSlug(title) || 'product'
  const { data: taken } = await db.from('products').select('slug').like('slug', `${base}%`)
  const takenSet = new Set((taken ?? []).map((r: any) => r.slug))
  let slug = base
  for (let n = 2; takenSet.has(slug); n++) slug = `${base}-${n}`

  const { error } = await (db.from('products') as any).insert({ title, slug, description, thrivecart_product_id, is_active: false, category })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
}

export async function setProductCategory(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const category = ((formData.get('category') as string) || '').trim() || null
  const { error } = await (db.from('products') as any).update({ category }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
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
  const category = ((formData.get('category') as string) || '').trim() || null

  const { error } = await (db.from('products') as any).update({
    title, description, thrivecart_product_id, is_active, thumbnail_url, thumbnail_color, auto_grant_tags, category,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
}

export async function deleteProduct(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await db.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
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
  revalidatePath('/admin/content', 'layout')
}

export async function updateModule(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const thumbnail_url = (formData.get('thumbnail_url') as string) || null
  const thumbnail_color = (formData.get('thumbnail_color') as string) || null
  const required_tag = ((formData.get('required_tag') as string) || '').trim().toLowerCase() || null

  const { error } = await (db.from('modules') as any).update({ title, thumbnail_url, thumbnail_color, required_tag }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content', 'layout')
}

export async function deleteModule(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await db.from('modules').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content', 'layout')
}

export async function reorderModule(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const direction = formData.get('direction') as 'up' | 'down'
  const product_id = formData.get('product_id') as string

  const { data: modules } = await db.from('modules').select('id, sort_order').eq('product_id', product_id).order('sort_order')
  if (!modules) return

  const idx = modules.findIndex((m) => m.id === id)
  if (idx === -1) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= modules.length) return

  // Swap positions, then renumber sequentially so duplicate sort_orders
  // (from concurrent inserts) can never make reordering a no-op.
  const order = [...modules]
  ;[order[idx], order[swapIdx]] = [order[swapIdx], order[idx]]
  for (let i = 0; i < order.length; i++) {
    if (modules.find((m) => m.id === order[i].id)!.sort_order !== i + 1 || order[i].id !== modules[i]?.id) {
      const { error } = await db.from('modules').update({ sort_order: i + 1 }).eq('id', order[i].id)
      if (error) throw new Error(error.message)
    }
  }
  revalidatePath('/admin/content', 'layout')
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
  const is_preview = formData.get('is_preview') === 'on'
  const required_tag = (formData.get('required_tag') as string) || null

  const blocksRaw = (formData.get('content_blocks') as string) || '[]'
  let content_blocks: unknown = []
  try {
    const parsed = JSON.parse(blocksRaw)
    content_blocks = Array.isArray(parsed) ? parsed : []
  } catch {
    content_blocks = []
  }

  const { error } = await (db.from('lessons') as any).update({
    title, description, content_type, content_url, is_published, is_preview, required_tag, content_blocks,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content', 'layout')
}

export async function deleteLesson(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await db.from('lessons').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content', 'layout')
}

export async function reorderLesson(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const direction = formData.get('direction') as 'up' | 'down'
  const module_id = formData.get('module_id') as string

  const { data: lessons } = await db.from('lessons').select('id, sort_order').eq('module_id', module_id).order('sort_order')
  if (!lessons) return

  const idx = lessons.findIndex((l) => l.id === id)
  if (idx === -1) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= lessons.length) return

  const order = [...lessons]
  ;[order[idx], order[swapIdx]] = [order[swapIdx], order[idx]]
  for (let i = 0; i < order.length; i++) {
    if (lessons.find((l) => l.id === order[i].id)!.sort_order !== i + 1 || order[i].id !== lessons[i]?.id) {
      const { error } = await db.from('lessons').update({ sort_order: i + 1 }).eq('id', order[i].id)
      if (error) throw new Error(error.message)
    }
  }
  revalidatePath('/admin/content', 'layout')
}

// ── Site Settings ─────────────────────────────────────────────────────────────

export async function updateSiteSettings(formData: FormData) {
  const db = await getAdminClient()
  const announcement_active = formData.get('announcement_active') === 'on' ? 'true' : 'false'
  const announcement_text = (formData.get('announcement_text') as string) || ''

  const now = new Date().toISOString()
  const { error } = await (db as any).from('site_settings').upsert([
    { key: 'announcement_active', value: announcement_active, updated_at: now },
    { key: 'announcement_text', value: announcement_text, updated_at: now },
  ])
  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings')
  revalidatePath('/dashboard')
}

// ── User Tags ─────────────────────────────────────────────────────────────────

export async function updateUserTags(formData: FormData) {
  const db = await getAdminClient()
  const userId = formData.get('user_id') as string
  const tagsRaw = (formData.get('tags') as string) || ''
  const tags = tagsRaw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)

  const { error } = await (db.from('profiles') as any).update({ tags }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}
