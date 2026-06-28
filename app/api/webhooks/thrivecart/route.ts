export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'

// ThriveCart sends a HMAC-SHA256 signature in the X-Thrivecart-Signature header.
// The signature is computed over the raw request body using the webhook secret.
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return expected === signature.toLowerCase()
}

export async function POST(request: Request) {
  const secret = process.env.THRIVECART_WEBHOOK_SECRET
  if (!secret) {
    console.error('THRIVECART_WEBHOOK_SECRET not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const rawBody = await request.text()

  // Verify signature if ThriveCart sends one
  const signature = request.headers.get('x-thrivecart-signature')
  if (signature) {
    const valid = await verifySignature(rawBody, signature, secret)
    if (!valid) {
      console.error('ThriveCart webhook signature mismatch')
      return new Response('Invalid signature', { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // ThriveCart event type
  const event = payload.event ?? payload.thrivecart?.event
  if (!event) return new Response('No event type', { status: 400 })

  // Only handle purchase/order events
  const purchaseEvents = ['order.success', 'purchase.complete', 'order.complete', 'subscription.new']
  if (!purchaseEvents.includes(event)) {
    return new Response(`Event ${event} ignored`, { status: 200 })
  }

  // Extract customer info
  const customer = payload.customer ?? payload.thrivecart?.customer ?? {}
  const email: string | undefined = customer.email ?? payload.email
  const firstName: string | undefined = customer.firstname ?? customer.first_name ?? payload.firstname
  const lastName: string | undefined = customer.lastname ?? customer.last_name ?? payload.lastname

  // Extract ThriveCart product ID
  const tcProductId: string | undefined =
    String(payload.product?.id ?? payload.thrivecart?.product?.id ?? payload.product_id ?? '')

  if (!email || !tcProductId) {
    console.error('Missing email or product_id in ThriveCart payload', { email, tcProductId })
    return new Response('Missing email or product_id', { status: 400 })
  }

  const db = createServiceSupabaseClient()

  // Look up the product by ThriveCart product ID
  const { data: product } = await db
    .from('products')
    .select('id, title')
    .eq('thrivecart_product_id', tcProductId)
    .single()

  if (!product) {
    console.warn(`No product found for ThriveCart product ID: ${tcProductId}`)
    // Return 200 so ThriveCart doesn't retry — this product may not be an LMS product
    return new Response(`No LMS product mapped for TC product ${tcProductId}`, { status: 200 })
  }

  // Find or create the user profile
  // First check if a user with this email exists in auth.users via profiles table
  const { data: existingProfile } = await db
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    // Create an auth user with a magic link invite
    const { data: newUser, error: createError } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      },
    })

    if (createError || !newUser.user) {
      console.error('Failed to create auth user:', createError)
      return new Response('Failed to create user', { status: 500 })
    }

    userId = newUser.user.id

    // Upsert profile
    await db.from('profiles').upsert({
      id: userId,
      email,
      full_name: [firstName, lastName].filter(Boolean).join(' ') || null,
      role: 'user',
    }, { onConflict: 'id' })
  }

  // Grant product access (upsert to avoid duplicates)
  const transactionRef = String(payload.order_id ?? payload.thrivecart?.order?.id ?? payload.transaction_id ?? '')

  const { error: accessError } = await db.from('user_product_access').upsert({
    user_id: userId,
    product_id: product.id,
    granted_by: 'thrivecart_webhook',
    transaction_ref: transactionRef || null,
    granted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })

  if (accessError) {
    console.error('Failed to grant access:', accessError)
    return new Response('Failed to grant access', { status: 500 })
  }

  // Log the event
  await db.from('activity_logs').insert({
    user_id: userId,
    product_id: product.id,
    event_type: 'purchase',
    metadata: {
      tc_event: event,
      tc_product_id: tcProductId,
      transaction_ref: transactionRef,
      email,
    },
  })

  console.log(`Access granted: ${email} → ${product.title}`)
  return new Response('OK', { status: 200 })
}
