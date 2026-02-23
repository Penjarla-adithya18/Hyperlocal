const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

const PBKDF2_ITERATIONS = 210_000

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  )
  return toBase64Url(new Uint8Array(bits))
}

export function randomBase64Url(bytesLength = 32): string {
  const bytes = new Uint8Array(bytesLength)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

export async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return toBase64Url(new Uint8Array(digest))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const digest = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${digest}`
}

export async function verifyPassword(password: string, encodedHash: string | null | undefined): Promise<boolean> {
  try {
    if (!encodedHash) return false

    const [scheme, iterationsRaw, saltRaw, hashRaw] = encodedHash.split('$')
    if (scheme !== 'pbkdf2' || !iterationsRaw || !saltRaw || !hashRaw) {
      return false
    }

    const iterations = Number(iterationsRaw)
    if (!Number.isFinite(iterations) || iterations < 50_000) {
      return false
    }

    const salt = fromBase64Url(saltRaw)
    const computed = await derivePbkdf2(password, salt, iterations)
    return timingSafeEqual(computed, hashRaw)
  } catch {
    return false
  }
}
