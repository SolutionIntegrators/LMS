'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

// Create a user (if needed), send the branded invite email, set their name,
// and optionally grant a product — all in one step.
export async function inviteUser(formData: FormData) {
  await requireAdmin()
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const fullName = ((formData.get('full_name') as string) || '').trim()
  const productId = (formData.get('product_id') as string) || ''
  if (!email) throw new Error('Email is required')

  const svc = createServiceSupabaseClient()

  // Existing user? (invite would fail with "already registered")
  const { data: existing } = await svc.from('profiles').select('id').eq('email', email).single()
  let userId = existing?.id as string | undefined

  if (!userId) {
    const { data, error } = await svc.auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : undefined,
    })
    if (error) throw new Error(`Invite failed: ${error.message}`)
    userId = data.user.id
  }

  await (svc.from('profiles') as any).upsert(
    { id: userId, email, ...(fullName ? { full_name: fullName } : {}), role: 'user' },
    { onConflict: 'id' }
  )

  if (productId) {
    const { error } = await svc.from('user_product_access').upsert({
      user_id: userId!,
      product_id: productId,
      granted_by: 'admin',
      granted_at: new Date().toISOString(),
    } as any, { onConflict: 'user_id,product_id', ignoreDuplicates: true })
    if (error) throw new Error(`User invited, but grant failed: ${error.message}`)
  }

  revalidatePath('/admin/users')
}

export async function updateUserName(formData: FormData) {
  const db = await requireAdmin()
  const userId = formData.get('user_id') as string
  const fullName = ((formData.get('full_name') as string) || '').trim() || null
  const { error } = await (db.from('profiles') as any).update({ full_name: fullName }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

export async function grantProduct(formData: FormData) {
  const db = await requireAdmin()
  const userId = formData.get('user_id') as string
  const productId = formData.get('product_id') as string
  if (!productId) return
  const { error } = await (db.from('user_product_access') as any).upsert({
    user_id: userId,
    product_id: productId,
    granted_by: 'admin',
    granted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

export async function revokeProduct(formData: FormData) {
  const db = await requireAdmin()
  const userId = formData.get('user_id') as string
  const productId = formData.get('product_id') as string
  const { error } = await db.from('user_product_access').delete()
    .eq('user_id', userId).eq('product_id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}
