'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/pushNotifications'

/**
 * Silently registers the service worker on first mount.
 * Renders nothing — exists purely for side-effect.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
