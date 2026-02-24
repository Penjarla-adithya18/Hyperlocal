'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Locale = 'en' | 'hi' | 'te'

// ──────────────────────────────────────────────────────────────────────────
// Translation dictionaries (English / Hindi / Telugu)
// Only covers UI labels — extend as needed.
// ──────────────────────────────────────────────────────────────────────────
const translations: Record<Locale, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.jobs': 'Jobs',
    'nav.applications': 'Applications',
    'nav.chat': 'Chat',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'job.applyNow': 'Apply Now',
    'job.applied': 'Applied',
    'job.location': 'Location',
    'job.pay': 'Pay',
    'job.duration': 'Duration',
    'job.requiredSkills': 'Required Skills',
    'job.description': 'Description',
    'job.postJob': 'Post a Job',
    'job.status.active': 'Active',
    'job.status.draft': 'Pending Payment',
    'job.status.completed': 'Completed',
    'job.status.cancelled': 'Cancelled',
    'payment.escrowSecured': 'Escrow Secured',
    'payment.releasePayment': 'Release Payment',
    'payment.raiseDispute': 'Raise a Dispute',
    'worker.hireWorker': 'Hire Worker',
    'worker.matchScore': 'Match Score',
    'common.loading': 'Loading…',
    'common.viewDetails': 'View Details',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.noResults': 'No results found',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.jobs': 'नौकरियाँ',
    'nav.applications': 'आवेदन',
    'nav.chat': 'चैट',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.logout': 'लॉगआउट',
    'job.applyNow': 'अभी आवेदन करें',
    'job.applied': 'आवेदन किया',
    'job.location': 'स्थान',
    'job.pay': 'वेतन',
    'job.duration': 'अवधि',
    'job.requiredSkills': 'आवश्यक कौशल',
    'job.description': 'विवरण',
    'job.postJob': 'नौकरी पोस्ट करें',
    'job.status.active': 'सक्रिय',
    'job.status.draft': 'भुगतान लंबित',
    'job.status.completed': 'पूर्ण',
    'job.status.cancelled': 'रद्द',
    'payment.escrowSecured': 'एस्क्रो सुरक्षित',
    'payment.releasePayment': 'भुगतान जारी करें',
    'payment.raiseDispute': 'विवाद दर्ज करें',
    'worker.hireWorker': 'कामगार को काम पर रखें',
    'worker.matchScore': 'मिलान स्कोर',
    'common.loading': 'लोड हो रहा है…',
    'common.viewDetails': 'विवरण देखें',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.submit': 'जमा करें',
    'common.back': 'वापस',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.noResults': 'कोई परिणाम नहीं',
  },
  te: {
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.jobs': 'ఉద్యోగాలు',
    'nav.applications': 'దరఖాస్తులు',
    'nav.chat': 'చాట్',
    'nav.profile': 'ప్రొఫైల్',
    'nav.logout': 'లాగ్అవుట్',
    'job.applyNow': 'ఇప్పుడే దరఖాస్తు చేయండి',
    'job.applied': 'దరఖాస్తు చేసారు',
    'job.location': 'స్థానం',
    'job.pay': 'జీతం',
    'job.duration': 'వ్యవధి',
    'job.requiredSkills': 'అవసరమైన నైపుణ్యాలు',
    'job.description': 'వివరణ',
    'job.postJob': 'ఉద్యోగం పోస్ట్ చేయండి',
    'job.status.active': 'క్రియాశీలం',
    'job.status.draft': 'చెల్లింపు పెండింగ్',
    'job.status.completed': 'పూర్తయింది',
    'job.status.cancelled': 'రద్దు',
    'payment.escrowSecured': 'ఎస్క్రో సురక్షితం',
    'payment.releasePayment': 'చెల్లింపు విడుదల చేయండి',
    'payment.raiseDispute': 'వివాదం నమోదు చేయండి',
    'worker.hireWorker': 'కార్మికుడిని నియమించండి',
    'worker.matchScore': 'మ్యాచ్ స్కోర్',
    'common.loading': 'లోడ్ అవుతోంది…',
    'common.viewDetails': 'వివరాలు చూడండి',
    'common.save': 'సేవ్ చేయండి',
    'common.cancel': 'రద్దు చేయండి',
    'common.submit': 'సమర్పించండి',
    'common.back': 'వెనక్కి',
    'common.search': 'వెతకండి',
    'common.filter': 'ఫిల్టర్',
    'common.noResults': 'ఫలితాలు లేవు',
  },
}

// ──────────────────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────────────────
interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en'
    return (localStorage.getItem('locale') as Locale) ?? 'en'
  })

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') localStorage.setItem('locale', l)
  }

  const t = (key: string): string => translations[locale][key] ?? translations['en'][key] ?? key

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिंदी',
  te: 'తెలుగు',
}

export type { Locale }
