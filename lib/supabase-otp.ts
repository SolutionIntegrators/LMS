import { createClient } from '@supabase/supabase-js'

// A plain (non-SSR) client used ONLY to initiate email auth flows
// (magic link, password reset). @supabase/ssr forces PKCE, which embeds a
// browser-bound pkce_ token in the email link that fails when opened on a
// different device. This client uses the implicit flow so the email carries
// a plain OTP token_hash that /auth/callback can verifyOtp() cross-device.
// It does not persist a session (the callback establishes the cookie session
// server-side), so it never fights the SSR client for auth state.
export function createOtpClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false } }
  )
}
