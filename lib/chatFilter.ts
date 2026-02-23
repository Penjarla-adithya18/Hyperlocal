// lib/chatFilter.ts
// Detects and blocks unsafe content in chat messages.
// Prevents users from sharing phone numbers, WhatsApp links,
// or trying to take conversations off-platform.

// ── Patterns that indicate off-platform contact sharing ──────────────────────

const PHONE_PATTERNS = [
  /\+91\s*[6-9]\d{9}/,            // +91 mobile numbers
  /\b0?[6-9]\d{9}\b/,             // 10-digit mobile numbers
  /\b91[6-9]\d{9}\b/,             // 91XXXXXXXXXX format
  /\d[\s\-\.]{0,2}\d[\s\-\.]{0,2}\d[\s\-\.]{0,2}\d[\s\-\.]{0,2}\d[\s\-\.]{0,2}\d[\s\-\.]{0,2}\d[\s\-\.]{0,2}\d[\s\-\.]{0,2}\d[\s\-\.]{0,2}\d/, // spaced numbers
]

const KEYWORD_PATTERNS = [
  // WhatsApp / off-platform signals
  /\bwhatsapp\b/i,
  /\bwhatsap\b/i,
  /\bwa\.me\b/i,
  /\bwa\s*me\b/i,
  /\btelegram\b/i,
  /\bsignal\b/i,
  /\bwechat\b/i,

  // Call/contact keywords
  /\bcall\s*me\b/i,
  /\bcontact\s*me\b/i,
  /\bmy\s*number\b/i,
  /\bphone\s*number\b/i,
  /\bmobile\s*number\b/i,
  /\bgive\s*(me\s*)?(your|ur)\s*(no|num|number)/i,
  /\b(call|contact)\s*(on|at|thru|through)/i,
  /\bcall\s*(kar|karo|karna|pls|plz)\b/i,  // Hindi variants
  /\bnumber\s*(do|dena|share)\b/i,

  // Fraud keywords
  /registration\s*fee/i,
  /deposit\s*required/i,
  /advance\s*payment/i,
  /bank\s*transfer/i,
  /gpay\s*first/i,
  /phonepay\s*first/i,
  /paytm\s*first/i,
  /send\s*money/i,

  // Email sharing
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,

  // Social handles
  /\binstagram\b/i,
  /\bfacebook\b/i,
  /\blinkedin\b/i,
  /\btwitter\b/i,
  /\binsta\b/i,
]

export interface FilterResult {
  blocked: boolean
  reason?: string
  category?: 'phone' | 'contact' | 'fraud' | 'social'
}

export function filterChatMessage(message: string): FilterResult {
  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        reason: 'Phone numbers cannot be shared in chat. Use the in-app chat to communicate safely.',
        category: 'phone',
      }
    }
  }

  for (const pattern of KEYWORD_PATTERNS) {
    if (pattern.test(message)) {
      // Fraud keywords are strict
      if (/registration\s*fee|deposit\s*required|advance\s*payment|send\s*money/i.test(message)) {
        return {
          blocked: true,
          reason: 'This message was blocked because it contains potential fraud keywords. If you need help, contact platform support.',
          category: 'fraud',
        }
      }

      // Off-platform contact keywords
      if (/whatsapp|wa\.me|telegram|signal|wechat/i.test(message)) {
        return {
          blocked: true,
          reason: 'Please keep all conversations within the app for your safety. External contact sharing is not allowed.',
          category: 'social',
        }
      }

      if (/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i.test(message)) {
        return {
          blocked: true,
          reason: 'Email addresses cannot be shared in chat. Use the in-app chat to stay safe.',
          category: 'contact',
        }
      }

      return {
        blocked: true,
        reason: 'This message appears to share personal contact information. All communication must stay within the app.',
        category: 'contact',
      }
    }
  }

  return { blocked: false }
}

// Mask any phone numbers or emails that slip through (secondary layer)
export function maskSensitiveContent(message: string): string {
  let masked = message

  // Mask phone-like numbers
  masked = masked.replace(/\+91\s*[6-9]\d{9}/g, '[phone hidden]')
  masked = masked.replace(/\b0?[6-9]\d{9}\b/g, '[phone hidden]')
  masked = masked.replace(/\b91[6-9]\d{9}\b/g, '[phone hidden]')

  // Mask emails
  masked = masked.replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, '[email hidden]')

  return masked
}
