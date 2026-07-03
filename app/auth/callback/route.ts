export const runtime = 'edge'


import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const otpType = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code || tokenHash) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // PKCE flow (login-page magic links) uses ?code; email templates
    // (invite/confirm/recovery/magiclink) link with ?token_hash&type.
    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: (otpType as any) ?? 'magiclink', token_hash: tokenHash! })

    if (!error && data.user) {
      // Upsert profile and update last_login_at
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email!,
        last_login_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      // Log the login event
      await supabase.from('activity_logs').insert({
        user_id: data.user.id,
        event_type: 'login',
        metadata: { method: otpType === 'recovery' ? 'password_reset' : 'magic_link' },
      })

      // Password-reset links land on the set-new-password page (session is now active).
      const dest = otpType === 'recovery' ? '/reset-password' : next
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
