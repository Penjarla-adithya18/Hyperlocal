import { NextRequest, NextResponse } from 'next/server'

const protectedPrefixes = ['/worker', '/employer', '/admin']

export function proxy(request: NextRequest) {
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true'
  if (!useSupabase) {
    return NextResponse.next()
  }

  const pathname = request.nextUrl.pathname
  const isProtectedPath = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (!isProtectedPath) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('session_token')?.value
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/worker/:path*', '/employer/:path*', '/admin/:path*'],
}
