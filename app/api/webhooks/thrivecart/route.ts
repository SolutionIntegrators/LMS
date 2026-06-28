export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'

export async function GET() {
  return new Response('ThriveCart webhook endpoint active', { status: 200 })
}

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

async function grantAccess(email: string, tcProductId: string, transactionRef: string, eventType: string, metadata: Record<string, unknown>) {
  const db = createServiceSupabaseClient()

  const { data: product } = await (db as any)
    .from('products')
    .select('id, title, auto_grant_tags')
    .eq('thrivecart_product_id', tcProductId)
    .single()

  if (!product) {
    console.warn(`No LMS product mapped for ThriveCart product ID: ${tcProductId}`)
    return { ok: true, message: `No LMS product mapped for TC product ${tcProductId}` }
  }

  const { data: existingProfile } = await db.from('profiles').select('id').eq('email', email).single()
  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    const nameParts = ((metadata.full_name as string) ?? '').split(' ')
    const { data: newUser, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: metadata.full_name ?? undefined },
    })
    if (error || !newUser.user) return { ok: false, message: `Failed to create user: ${error?.message}` }
    userId = newUser.user.id
    await db.from('profiles').upsert({ id: userId, email, full_name: (metadata.full_name as string) || null, role: 'user' }, { onConflict: 'id' })
  }

  const { error: accessError } = await db.from('user_product_access').upsert({
    user_id: userId,
    product_id: product.id,
    granted_by: metadata.source as string ?? 'webhook',
    transaction_ref: transactionRef || null,
    granted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })

  if (accessError) return { ok: false, message: `Failed to grant access: ${accessError.message}` }

  // Apply auto-grant tags from the product config
  const autoGrantTags: string[] = (product as any).auto_grant_tags ?? []
  if (autoGrantTags.length > 0) {
    const { data: profileData } = await (db as any).from('profiles').select('tags').eq('id', userId).single()
    const existingTags: string[] = profileData?.tags ?? []
    const mergedTags = [...new Set([...existingTags, ...autoGrantTags])]
    await (db as any).from('profiles').update({ tags: mergedTags }).eq('id', userId)
  }

  await db.from('activity_logs').insert({
    user_id: userId,
    product_id: product.id,
    event_type: eventType,
    metadata: { ...metadata, email, tc_product_id: tcProductId, transaction_ref: transactionRef },
  })

  console.log(`Access granted: ${email} → ${product.title}`)
  return { ok: true, message: `Access granted: ${email} → ${product.title}` }
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  // Handle ThriveCart test ping (empty body or ping event) — always return 200
  if (!rawBody || rawBody === '{}') return new Response('OK', { status: 200 })

  // Verify signature if secret is configured and header is present
  const secret = process.env.THRIVECART_WEBHOOK_SECRET
  const signature = request.headers.get('x-thrivecart-signature')
  if (secret && signature) {
    const valid = await verifySignature(rawBody, signature, secret)
    if (!valid) return new Response('Invalid signature', { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    // ThriveCart occasionally sends form-encoded data
    try {
      const params = new URLSearchParams(rawBody)
      payload = Object.fromEntries(params.entries())
    } catch {
      return new Response('Unparseable body', { status: 400 })
    }
  }

  const event: string = payload.event ?? payload.thrivecart?.event ?? 'unknown'

  // Ignore non-purchase events (ping, etc.)
  const purchaseEvents = ['order.success', 'purchase.complete', 'order.complete', 'subscription.new', 'order_success', 'purchase_complete']
  if (!purchaseEvents.includes(event)) {
    return new Response(`Event "${event}" acknowledged`, { status: 200 })
  }

  const customer = payload.customer ?? payload.thrivecart?.customer ?? {}
  const email: string = customer.email ?? payload.email ?? ''
  const firstName: string = customer.firstname ?? customer.first_name ?? payload.firstname ?? ''
  const lastName: string = customer.lastname ?? customer.last_name ?? payload.lastname ?? ''
  const tcProductId: string = String(payload.product?.id ?? payload.thrivecart?.product?.id ?? payload.product_id ?? '')
  const transactionRef: string = String(payload.order_id ?? payload.thrivecart?.order?.id ?? payload.transaction_id ?? '')

  if (!email || !tcProductId) {
    return new Response(JSON.stringify({ error: 'Missing email or product_id', received: { email, tcProductId } }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const result = await grantAccess(email, tcProductId, transactionRef, 'purchase', {
    source: 'thrivecart',
    tc_event: event,
    full_name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
  })

  return new Response(result.message, { status: result.ok ? 200 : 500 })
}
