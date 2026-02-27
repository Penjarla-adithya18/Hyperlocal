import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

/**
 * Push subscription management edge function.
 *
 * POST  ?action=subscribe   — save/update a Web Push subscription for the current user
 * DELETE ?action=unsubscribe — remove all push subscriptions for the current user
 *
 * VAPID keys must be set as Supabase secrets:
 *   VAPID_PUBLIC_KEY   — URL-safe base64 public key
 *   VAPID_PRIVATE_KEY  — URL-safe base64 private key
 *   VAPID_SUBJECT      — mailto: or https: contact URL
 *
 * Generate keys with:
 *   npx web-push generate-vapid-keys --json
 * Then set them:
 *   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:admin@yourdomain.com
 */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const method = req.method

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error

    // ── Subscribe: save this device's push subscription ──────────────────────
    if (method === 'POST' && action === 'subscribe') {
      const body = await req.json()
      const { endpoint, p256dh, auth: authKey } = body as {
        endpoint?: string
        p256dh?: string
        auth?: string
      }

      if (!endpoint || !p256dh || !authKey) {
        return errorResponse('endpoint, p256dh, and auth are required', 400)
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: auth.user.id,
          endpoint,
          p256dh,
          auth: authKey,
        },
        { onConflict: 'endpoint' }
      )
      if (error) throw error

      return jsonResponse({ data: { ok: true } })
    }

    // ── Unsubscribe: remove all subscriptions for this user ───────────────────
    if (method === 'DELETE' && action === 'unsubscribe') {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', auth.user.id)
      if (error) throw error

      return jsonResponse({ data: { ok: true } })
    }

    return errorResponse('Invalid action. Use ?action=subscribe (POST) or ?action=unsubscribe (DELETE)', 400)
  } catch (err) {
    console.error('push function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})
