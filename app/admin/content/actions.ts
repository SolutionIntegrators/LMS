'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Products ──────────────────────────────────────────────

export async function createProduct(formData: FormData) {
  await requireAdmin()
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const thrivecart_product_id = (formData.get('thrivecart_product_id') as string) || null
  const slug = toSlug(title)

  const db = createServiceSupabaseClient()
  const { error } = await db.from('products').insert({ title, slug, description, thrivecart_product_id, is_active: false })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
}

export async function updateProduct(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const thrivecart_product_id = (formData.get('thrivecart_product_id') as string) || null
  const is_active = formData.get('is_active') === 'true'
  const slug = toSlug(title)

  const db = createServiceSupabaseClient()
  const { error } = await db.from('products').update({ title, slug, description, thrivecart_product_id, is_active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
  revalidatePath(`/admin/content/${slug}`)
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const db = createServiceSupabaseClient()
  const { error } = await db.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
  redirect('/admin/content')
}

// ── Modules ───────────────────────────────────────────────

export async function createModule(formData: FormData) {
  await requireAdmin()
  const product_id = formData.get('product_id') as string
  const title = formData.get('title') as string
  const productSlug = formData.get('productSlug') as string

  const db = createServiceSupabaseClient()
  const { data: existing } = await db.from('modules').select('sort_order').eq('product_id', product_id).order('sort_order', { ascending: false }).limit(1)
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await db.from('modules').insert({ product_id, title, sort_order })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/${productSlug}`)
}

export async function updateModule(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const productSlug = formData.get('productSlug') as string

  const db = createServiceSupabaseClient()
  const { error } = await db.from('modules').update({ title }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/${productSlug}`)
}

export async function deleteModule(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const productSlug = formData.get('productSlug') as string

  const db = createServiceSupabaseClient()
  const { error } = await db.from('modules').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/${productSlug}`)
}

export async function reorderModule(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const direction = formData.get('direction') as 'up' | 'down'
  const product_id = formData.get('product_id') as string
  const productSlug = formData.get('productSlug') as string

  const db = createServiceSupabaseClient()
  const { data: modules } = await db.from('modules').select('id, sort_order').eq('product_id', product_id).order('sort_order')
  if (!modules) return

  const idx = modules.findIndex((m) => m.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= modules.length) return

  const a = modules[idx]
  const b = modules[swapIdx]
  await db.from('modules').update({ sort_order: b.sort_order }).eq('id', a.id)
  await db.from('modules').update({ sort_order: a.sort_order }).eq('id', b.id)
  revalidatePath(`/admin/content/${productSlug}`)
}

// ── Lessons ───────────────────────────────────────────────

export async function createLesson(formData: FormData) {
  await requireAdmin()
  const module_id = formData.get('module_id') as string
  const title = formData.get('title') as string
  const productSlug = formData.get('productSlug') as string

  const db = createServiceSupabaseClient()
  const { data: existing } = await db.from('lessons').select('sort_order').eq('module_id', module_id).order('sort_order', { ascending: false }).limit(1)
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await db.from('lessons').insert({ module_id, title, sort_order, is_published: false }).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/${productSlug}`)
  redirect(`/admin/content/${productSlug}/lessons/${data.id}`)
}

export async function updateLesson(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const content_type = (formData.get('content_type') as string) || null
  const content_url = (formData.get('content_url') as string) || null
  const is_published = formData.get('is_published') === 'on'
  const is_preview = formData.get('is_preview') === 'on'
  const productSlug = formData.get('productSlug') as string

  const db = createServiceSupabaseClient()
  const { error } = await db.from('lessons').update({ title, description, content_type, content_url, is_published, is_preview }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/${productSlug}`)
  revalidatePath(`/admin/content/${productSlug}/lessons/${id}`)
}

export async function deleteLesson(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const productSlug = formData.get('productSlug') as string

  const db = createServiceSupabaseClient()
  const { error } = await db.from('lessons').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/${productSlug}`)
  redirect(`/admin/content/${productSlug}`)
}

export async function reorderLesson(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const direction = formData.get('direction') as 'up' | 'down'
  const module_id = formData.get('module_id') as string
  const productSlug = formData.get('productSlug') as string

  const db = createServiceSupabaseClient()
  const { data: lessons } = await db.from('lessons').select('id, sort_order').eq('module_id', module_id).order('sort_order')
  if (!lessons) return

  const idx = lessons.findIndex((l) => l.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= lessons.length) return

  const a = lessons[idx]
  const b = lessons[swapIdx]
  await db.from('lessons').update({ sort_order: b.sort_order }).eq('id', a.id)
  await db.from('lessons').update({ sort_order: a.sort_order }).eq('id', b.id)
  revalidatePath(`/admin/content/${productSlug}`)
}
