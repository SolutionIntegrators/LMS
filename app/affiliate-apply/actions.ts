'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createPartnerApplication } from '@/lib/airtable'

export async function submitAffiliateApplication(formData: FormData): Promise<{ status: 'created' | 'already_exists' }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: profile } = await (supabase as any).from('profiles').select('email, full_name').eq('id', user.id).single()
  const email = profile?.email || user.email || ''
  const fullName = (profile?.full_name || '').trim()
  if (!email) throw new Error('No email on file for your account')
  if (!fullName) throw new Error('Add your name on your Profile page before applying')

  const businessName = ((formData.get('business_name') as string) || '').trim() || null
  const paypalEmail = ((formData.get('paypal_email') as string) || '').trim() || null
  const agreed = formData.get('agree_terms') === 'true'
  const productNames = (formData.getAll('products') as string[]).map((p) => p.trim()).filter(Boolean)

  if (!agreed) throw new Error('You must agree to the Affiliate Program terms to apply')

  const result = await createPartnerApplication({ fullName, email, businessName, paypalEmail, productNames })
  if (result === 'error') throw new Error('Something went wrong submitting your application — please try again or contact support')
  return { status: result }
}
