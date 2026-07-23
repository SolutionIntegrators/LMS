'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function requireUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  return { supabase, user }
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser()
  const full_name = ((formData.get('full_name') as string) || '').trim() || null

  const update: Record<string, any> = { full_name }
  // Only touch avatar_url if the form actually carried the field (so saving
  // just the name never clobbers an existing avatar).
  if (formData.has('avatar_url')) {
    update.avatar_url = ((formData.get('avatar_url') as string) || '').trim() || null
  }

  const { error } = await (supabase as any).from('profiles').update(update).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/profile')
}

// Community notification preferences: community_subscriptions rows are
// created automatically on purchase (see lib/grant.ts); this just toggles
// the existing row rather than creating a new one.
export async function toggleCommunitySubscription(formData: FormData) {
  const { supabase, user } = await requireUser()
  const productId = formData.get('product_id') as string
  const subscribed = formData.get('subscribed') === 'true'

  const { error } = await (supabase as any).from('community_subscriptions')
    .update({ subscribed }).eq('user_id', user.id).eq('product_id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/profile')
}
