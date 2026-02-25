import { NextRequest, NextResponse } from 'next/server'
import {
  LOCALE_COOKIE,
  SupportedLocale,
  defaultLocale,
  detectLocaleFromHeader,
  locales,
} from './i18n'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|css|js|json)$/)
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // ── Determine locale ────────────────────────────────────────────────────
  // Priority: 1. URL search param (?lang=hi)  2. Cookie  3. Accept-Language header
  const urlLang = request.nextUrl.searchParams.get('lang') as SupportedLocale | null
  const cookieLang = request.cookies.get(LOCALE_COOKIE)?.value as SupportedLocale | undefined
  const headerLang = detectLocaleFromHeader(
    request.headers.get('accept-language')
  )

  let detectedLocale: SupportedLocale = defaultLocale

  if (urlLang && (locales as readonly string[]).includes(urlLang)) {
    detectedLocale = urlLang
  } else if (cookieLang && (locales as readonly string[]).includes(cookieLang)) {
    detectedLocale = cookieLang
  } else {
    detectedLocale = headerLang
  }

  // ── Set locale cookie so the client reads it on first load ──────────────
  // Only set if it differs from what's already stored (avoids unnecessary cookie writes)
  if (!cookieLang || cookieLang !== detectedLocale) {
    response.cookies.set(LOCALE_COOKIE, detectedLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })
  }

  // ── Pass detected locale as a header to the app ─────────────────────────
  // The client-side I18nContext reads localStorage first, but this header
  // allows server components / layout to know the locale if needed.
  response.headers.set('x-hl-locale', detectedLocale)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
