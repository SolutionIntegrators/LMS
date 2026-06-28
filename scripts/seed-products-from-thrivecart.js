// ============================================================
// seed-products-from-thrivecart.js
// One-time script to pull your ThriveCart products and seed
// them into your Supabase `products` table.
//
// Usage:
//   node scripts/seed-products-from-thrivecart.js
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const THRIVECART_API_KEY   = process.env.THRIVECART_API_KEY
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!THRIVECART_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars. Check .env.local has THRIVECART_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function fetchThriveCartProducts() {
  console.log('Fetching products from ThriveCart...')

  const response = await fetch('https://thrivecart.com/api/external/products', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${THRIVECART_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`ThriveCart API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  // ThriveCart returns a plain array, not wrapped in a `products` key
  return Array.isArray(data) ? data : (data.products || [])
}

async function seedProducts(products) {
  console.log(`\nFound ${products.length} product(s) in ThriveCart.\n`)

  const seenSlugs = new Set()
  const rows = products.map((p) => {
    let slug = slugify(p.name)
    // Append ThriveCart ID if slug already used by another product
    if (seenSlugs.has(slug)) slug = `${slug}-${p.product_id}`
    seenSlugs.add(slug)
    return {
      thrivecart_product_id: String(p.product_id),
      title:                 p.name,
      slug,
      description:           null,
      cover_image_url:       null,
      is_active:             false,
    }
  })

  console.log('Products to be created in Supabase:')
  rows.forEach((r, i) => {
    console.log(`  ${i + 1}. "${r.title}"`)
    console.log(`     slug: ${r.slug}`)
    console.log(`     thrivecart_id: ${r.thrivecart_product_id}`)
  })

  console.log('\nInserting into Supabase...')

  let successCount = 0
  for (const row of rows) {
    const { data, error } = await supabase
      .from('products')
      .upsert(row, { onConflict: 'thrivecart_product_id', ignoreDuplicates: false })
      .select()
      .single()

    if (error) {
      // If slug collides with existing row, append TC id and retry
      if (error.code === '23505' && error.message.includes('slug')) {
        row.slug = `${row.slug}-${row.thrivecart_product_id}`
        const { data: data2, error: error2 } = await supabase
          .from('products')
          .upsert(row, { onConflict: 'thrivecart_product_id', ignoreDuplicates: false })
          .select()
          .single()
        if (error2) {
          console.warn(`  ✗ Skipped "${row.title}": ${error2.message}`)
        } else {
          console.log(`  → ${data2.title} (slug: ${data2.slug})`)
          successCount++
        }
      } else {
        console.warn(`  ✗ Skipped "${row.title}": ${error.message}`)
      }
    } else {
      console.log(`  → ${data.title} (slug: ${data.slug})`)
      successCount++
    }
  }

  console.log(`\n✓ ${successCount}/${rows.length} product(s) seeded successfully.`)
}

async function run() {
  try {
    const products = await fetchThriveCartProducts()

    if (products.length === 0) {
      console.log('No products found in ThriveCart. Double-check your API key.')
      return
    }

    await seedProducts(products)
    console.log('\nDone. Next steps:')
    console.log('  1. Add descriptions and cover images to each product in Supabase')
    console.log('  2. Run the customer access migration script')
    console.log('  3. Build out modules and lessons for each product')

  } catch (err) {
    console.error('\nScript failed:', err.message)
    process.exit(1)
  }
}

run()
