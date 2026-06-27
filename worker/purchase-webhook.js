/**
 * Cloudflare Worker — Post-Purchase Webhook
 *
 * Receives POST from Zapier after a Dubsado payment is confirmed.
 * Environment secrets (set via wrangler or Cloudflare dashboard):
 *   SUPABASE_URL            — your Supabase project URL
 *   SUPABASE_SERVICE_KEY    — service role key (bypasses RLS)
 *   WEBHOOK_SECRET          — shared secret Zapier sends in X-Webhook-Secret header
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Verify shared secret
    const incomingSecret = request.headers.get('X-Webhook-Secret')
    if (!incomingSecret || incomingSecret !== env.WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const { email, product_slug, transaction_ref } = body

    if (!email || !product_slug) {
      return new Response('Missing required fields: email, product_slug', { status: 400 })
    }

    const supabaseUrl = env.SUPABASE_URL
    const serviceKey = env.SUPABASE_SERVICE_KEY
    const headers = {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    }

    try {
      // 1. Look up the product by slug
      const productRes = await fetch(
        `${supabaseUrl}/rest/v1/products?slug=eq.${encodeURIComponent(product_slug)}&select=id,title&limit=1`,
        { headers }
      )
      const products = await productRes.json()
      if (!products.length) {
        return new Response(`Product not found: ${product_slug}`, { status: 404 })
      }
      const productId = products[0].id

      // 2. Look up existing user or create one
      const userLookupRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        { headers }
      )
      const userLookup = await userLookupRes.json()

      let userId
      if (userLookup.users && userLookup.users.length > 0) {
        userId = userLookup.users[0].id
      } else {
        // Create user with a random temp password; they'll use magic link
        const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email,
            email_confirm: true,
            password: crypto.randomUUID(),
          }),
        })
        const newUser = await createRes.json()
        if (!newUser.id) {
          return new Response(`Failed to create user: ${JSON.stringify(newUser)}`, { status: 500 })
        }
        userId = newUser.id
      }

      // 3. Grant product access
      await fetch(`${supabaseUrl}/rest/v1/user_product_access`, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=ignore-duplicates',
        },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId,
          granted_by: 'webhook',
          transaction_ref: transaction_ref ?? null,
        }),
      })

      // 4. Log the purchase event
      await fetch(`${supabaseUrl}/rest/v1/activity_logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: userId,
          event_type: 'purchase',
          product_id: productId,
          metadata: { transaction_ref, source: 'zapier_webhook' },
        }),
      })

      // 5. Send magic link so their first login is frictionless
      await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'magiclink',
          email,
          options: {
            redirect_to: `${env.SITE_URL ?? ''}/dashboard`,
          },
        }),
      })

      return new Response(JSON.stringify({ success: true, userId, productId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      console.error('Webhook error:', err)
      return new Response(`Internal server error: ${err.message}`, { status: 500 })
    }
  },
}
