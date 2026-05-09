import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Must reassign so the refreshed session token is written to the response
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // Always use getUser() — validates JWT server-side, unlike getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isDashboardRoute =
    url.pathname.startsWith('/agents') ||
    url.pathname.startsWith('/calls') ||
    url.pathname.startsWith('/numbers') ||
    url.pathname === '/'

  if (!user && isDashboardRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && url.pathname === '/login') {
    url.pathname = '/agents'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
