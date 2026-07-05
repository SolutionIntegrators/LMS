'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendAffiliateWelcomeEmail } from '@/lib/email'

async function getAdminClient() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

function toCode(raw: string) {
  return raw.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '')
}

export async function createAffiliate(formData: FormData) {
  const db = await getAdminClient()
  const name = (formData.get('name') as string).trim()
  const email = ((formData.get('email') as string) || '').trim() || null
  const destination_url = (formData.get('destination_url') as string).trim()
  const code = toCode((formData.get('code') as string) || name)

  if (!name || !destination_url || !code) throw new Error('Name, code and destination URL are required')
  if (!/^https?:\/\//.test(destination_url)) throw new Error('Destination URL must start with http(s)://')

  const { error } = await (db as any).from('affiliates').insert({ name, email, destination_url, code })
  if (error) throw new Error(error.code === '23505' ? `Code "${code}" is already taken` : error.message)

  // Email the partner their link (best-effort; needs RESEND_API_KEY, skips otherwise).
  if (email) {
    const host = (await headers()).get('host') ?? 'goodies.solutionintegrators.us'
    await sendAffiliateWelcomeEmail({ to: email, name: name || null, link: `https://${host}/r/${code}` })
  }
  revalidatePath('/admin/affiliates')
}

export async function updateAffiliate(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const destination_url = (formData.get('destination_url') as string).trim()
  if (!/^https?:\/\//.test(destination_url)) throw new Error('Destination URL must start with http(s)://')

  const { error } = await (db as any).from('affiliates').update({ destination_url }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/affiliates')
}

export async function toggleAffiliate(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await (db as any).from('affiliates').update({ is_active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/affiliates')
}

export async function deleteAffiliate(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await (db as any).from('affiliates').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/affiliates')
}
