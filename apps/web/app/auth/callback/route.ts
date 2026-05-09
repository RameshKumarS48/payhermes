import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          cookies: {
            getAll: () => [],
            setAll: () => {},
          },
        }
      )

      const { data: existingOrg } = await adminSupabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!existingOrg) {
        const emailPrefix = user.email?.split('@')[0] ?? 'my-org'
        const orgName =
          emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)

        const { error: orgError } = await adminSupabase
          .from('organizations')
          .insert({ owner_id: user.id, name: orgName })

        if (orgError) {
          console.error('[auth/callback] org creation error:', orgError)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/agents`)
}
