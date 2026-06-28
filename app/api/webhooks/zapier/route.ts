export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'

// Zapier sends a POST with JSON body.
// Auth: include ZAPIER_WEBHOOK_SECRET as x-api-key header in the Zapier request.
//
// Expected body:
// {
//   "email": "customer@example.com",
//   "product_id": "72",          // ThriveCart product ID — OR use product_slug below
//   "product_slug": "diagnose-your-biz-systems",  // alternative to product_id
//   "full_name": "Jane Smith",   // optional
//   "transaction_ref": "dubsado-invoice-123"  // optional, for your records
// }

export async function POST(request: Request) {
  // Auth
  const secret = process.env.ZAPIER_WEBHOOK_SECRET
  const apiKey = request.headers.get('x-api-key')

  if (!secret) return new Response('ZAPIER_WEBHOOK_SECRET not configured', { status: 500 })
  if (apiKey !== secret) return new Response('Unauthorized', { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const email: string = body.email ?? ''
  const productId: string = String(body.product_id ?? '')
  const productSlug: string = body.product_slug ?? ''
  const fullName: string = body.full_name ?? ''
  const transactionRef: string = body.transaction_ref ?? ''

  if (!email) return new Response('email is required', { status: 400 })
  if (!productId && !productSlug) return new Response('product_id or product_slug is required', { status: 400 })

  const db = createServiceSupabaseClient()

  // Look up product by ThriveCart ID or slug
  let productQuery = db.from('products').select('id, title')
  if (productId) {
    productQuery = productQuery.eq('thrivecart_product_id', productId) as any
  } else {
    productQuery = productQuery.eq('slug', productSlug) as any
  }
  const { data: product } = await productQuery.single()

  if (!product) {
    return new Response(
      JSON.stringify({ error: `No product found for ${productId ? `TC ID ${productId}` : `slug "${productSlug}"`}` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Find or create user
  const { data: existingProfile } = await db.from('profiles').select('id').eq('email', email).single()
  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    const { data: newUser, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName || undefined },
    })
    if (error || !newUser.user) {
      return new Response(`Failed to create user: ${error?.message}`, { status: 500 })
    }
    userId = newUser.user.id
    await db.from('profiles').upsert({ id: userId, email, full_name: fullName || null, role: 'user' }, { onConflict: 'id' })
  }

  // Grant access
  const { error: accessError } = await db.from('user_product_access').upsert({
    user_id: userId,
    product_id: product.id,
    granted_by: 'zapier_webhook',
    transaction_ref: transactionRef || null,
    granted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })

  if (accessError) {
    return new Response(`Failed to grant access: ${accessError.message}`, { status: 500 })
  }

  await db.from('activity_logs').insert({
    user_id: userId,
    product_id: product.id,
    event_type: 'purchase',
    metadata: { source: 'zapier', email, transaction_ref: transactionRef, full_name: fullName },
  })

  return Response.json({
    ok: true,
    message: `Access granted: ${email} → ${product.title}`,
    user_id: userId,
    product_id: product.id,
  })
}
