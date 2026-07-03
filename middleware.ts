import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirects must carry any refreshed auth cookies or rotated refresh
  // tokens get lost and users are spuriously logged out.
  function redirectTo(path: string) {
    const url = request.nextUrl.clone()
    url.pathname = path
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }

  // Public paths that don't require auth
  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/r/') // affiliate tracking links

  if (!user && !isPublicPath) return redirectTo('/login')

  if (user && pathname === '/login') return redirectTo('/dashboard')

  // Root → dashboard, /admin → /admin/content
  if (user && pathname === '/') return redirectTo('/dashboard')

  if (user && pathname === '/admin') return redirectTo('/admin/content')

  // Manage Access was merged into the Users page
  if (user && pathname === '/admin/access') return redirectTo('/admin/users')

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
