/**
 * i18n configuration for HyperLocal.
 * Defines supported locales, default locale, and locale metadata.
 */

export const locales = ['en', 'hi', 'te'] as const

export type SupportedLocale = (typeof locales)[number]

export const defaultLocale: SupportedLocale = 'en'

/** Human-readable locale names (shown in UI) */
export const localeNames: Record<SupportedLocale, string> = {
  en: 'English',
  hi: 'हिंदी',
  te: 'తెలుగు',
}

/** Locale labels with flag emojis for the language switcher */
export const localeLabels: Record<SupportedLocale, string> = {
  en: '🇬🇧 English',
  hi: '🇮🇳 हिंदी',
  te: '🌿 తెలుగు',
}

/** BCP 47 language tags for html[lang] and Accept-Language matching */
export const localeBCP47: Record<SupportedLocale, string> = {
  en: 'en',
  hi: 'hi',
  te: 'te',
}

/** Accept-Language header prefixes that map to our supported locales */
export const acceptLangMap: Record<string, SupportedLocale> = {
  en: 'en',
  hi: 'hi',
  te: 'te',
  // Regional variants
  'hi-in': 'hi',
  'te-in': 'te',
  'en-in': 'en',
  'en-us': 'en',
  'en-gb': 'en',
}

/**
 * Parse Accept-Language header and return best matching locale.
 * Falls back to defaultLocale.
 */
export function detectLocaleFromHeader(
  acceptLanguage: string | null
): SupportedLocale {
  if (!acceptLanguage) return defaultLocale

  // Parse "hi-IN,hi;q=0.9,en;q=0.8,te;q=0.7"
  const langs = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=')
      return { lang: lang.trim().toLowerCase(), q: parseFloat(q ?? '1') }
    })
    .sort((a, b) => b.q - a.q)

  for (const { lang } of langs) {
    const exact = acceptLangMap[lang]
    if (exact) return exact
    // Try prefix match (e.g. "te-Telu" → "te")
    const prefix = lang.split('-')[0]
    const prefixMatch = acceptLangMap[prefix]
    if (prefixMatch) return prefixMatch
  }

  return defaultLocale
}

/** Cookie name used to persist locale preference */
export const LOCALE_COOKIE = 'hl_locale'

/** LocalStorage key used to persist locale preference */
export const LOCALE_STORAGE_KEY = 'locale'
