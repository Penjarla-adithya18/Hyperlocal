/**
 * Web Push Notification helpers (client-side only).
 *
 * Usage:
 *   1. Call registerServiceWorker() once on app mount (layout.tsx)
 *   2. Call subscribeToPush() when user enables notifications (settings)
 *   3. Call unsubscribeFromPush() when user disables notifications
 *
 * VAPID public key must be set in environment:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<URL-safe base64 public key>
 */

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/** Convert URL-safe base64 string to Uint8Array for applicationServerKey */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i)
  }
  return arr.buffer as ArrayBuffer
}

/** Register the service worker. Safe to call multiple times. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch (err) {
    console.error('Service worker registration failed:', err)
    return null
  }
}

/** Returns current notification permission state, or 'unsupported'. */
export function getPushPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window) || !('PushManager' in window)) {
    return 'unsupported'
  }
  return Notification.permission as 'granted' | 'denied' | 'default'
}

/** Request permission and subscribe. Returns the subscription JSON or null on failure. */
export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — push notifications disabled')
    return null
  }
  if (typeof window === 'undefined' || !('Notification' in window) || !('PushManager' in window)) {
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing.toJSON()

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    return sub.toJSON()
  } catch (err) {
    console.error('Push subscription failed:', err)
    return null
  }
}

/** Unsubscribe the current device from push notifications. */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return true
    return sub.unsubscribe()
  } catch {
    return false
  }
}

/** Check whether this browser is currently subscribed. */
export async function isPushSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}
