export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'

async function hmacSign(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function getSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const key0 = new TextEncoder().encode('AWS4' + secret)
  const key1 = await hmacSign(key0, date)
  const key2 = await hmacSign(key1, region)
  const key3 = await hmacSign(key2, service)
  return hmacSign(key3, 'aws4_request')
}

export async function GET(request: Request) {
  // Verify admin
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('filename')
  const contentType = searchParams.get('contentType') ?? 'application/octet-stream'
  const lessonId = searchParams.get('lessonId') ?? 'unknown'

  if (!filename) return new Response('filename required', { status: 400 })

  const accountId = process.env.CF_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME ?? 'si-lms-content'

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return new Response('R2 credentials not configured (CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)', { status: 500 })
  }

  const region = 'auto'
  const service = 's3'
  const host = `${accountId}.r2.cloudflarestorage.com`
  const key = `lessons/${lessonId}/${filename}`

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const datetimeStr = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' // YYYYMMDDTHHmmssZ

  const credentialScope = `${dateStr}/${region}/${service}/aws4_request`
  const credential = `${accessKeyId}/${credentialScope}`
  const expiresIn = 3600 // 1 hour

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': datetimeStr,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
  })

  const canonicalRequest = [
    'PUT',
    `/${key}`,
    queryParams.toString(),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const canonicalRequestHash = await sha256Hex(canonicalRequest)
  const stringToSign = ['AWS4-HMAC-SHA256', datetimeStr, credentialScope, canonicalRequestHash].join('\n')
  const signingKey = await getSigningKey(secretAccessKey, dateStr, region, service)
  const signature = toHex(await hmacSign(signingKey, stringToSign))

  queryParams.set('X-Amz-Signature', signature)

  const presignedUrl = `https://${host}/${key}?${queryParams.toString()}`
  const publicUrl = `https://${host}/${key}`

  return Response.json({ presignedUrl, publicUrl, key })
}
