// deno-lint-ignore-file no-explicit-any
// @ts-ignore - npm:web-push typings loaded via deno.d.ts
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@hyperlocal.app'

let _vapidSet = false
function ensureVapid() {
  if (_vapidSet || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  _vapidSet = true
}

/** Send a push notification to a single user (all their subscribed devices). */
export async function sendPushToUser(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  url = '/',
  tag = 'notification'
): Promise<void> {
  ensureVapid()
  if (!_vapidSet) return

  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return

    const payload = JSON.stringify({ title, body, url, tag })
    for (const sub of subs as { endpoint: string; p256dh: string; auth: string }[]) {
      try {
        await (webpush as any).sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch {
        // Stale subscription — remove it
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  } catch (err) {
    console.error('sendPushToUser error:', err)
  }
}

/** Send a push notification to all subscribed users of a given role. */
export async function sendPushToRole(
  supabase: any,
  role: 'worker' | 'employer',
  title: string,
  body: string,
  url = '/',
  tag = 'notification'
): Promise<void> {
  ensureVapid()
  if (!_vapidSet) return

  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')

    if (!subs || subs.length === 0) return

    const userIds = [...new Set((subs as any[]).map((s: any) => s.user_id as string))]

    const { data: matchedUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', role)
      .in('id', userIds)

    if (!matchedUsers || matchedUsers.length === 0) return

    const allowedIds = new Set((matchedUsers as { id: string }[]).map((u) => u.id))
    const payload = JSON.stringify({ title, body, url, tag })

    for (const sub of (subs as { endpoint: string; p256dh: string; auth: string; user_id: string }[]).filter(
      (s) => allowedIds.has(s.user_id)
    )) {
      try {
        await (webpush as any).sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  } catch (err) {
    console.error('sendPushToRole error:', err)
  }
}
