'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, X } from 'lucide-react'

interface GeolocationPromptProps {
  onLocationGranted?: (coords: { lat: number; lng: number }) => void
  onDismiss?: () => void
}

export function GeolocationPrompt({ onLocationGranted, onDismiss }: GeolocationPromptProps) {
  const [show, setShow] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    // Check if geolocation is supported and not already granted
    if (!navigator.geolocation) return

    // Check if we've dismissed this before in this session
    const dismissed = sessionStorage.getItem('geolocation-prompt-dismissed')
    if (dismissed) return

    // Check if we already have permission
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((result) => {
      if (result.state === 'prompt') {
        // Show prompt after a short delay to not overwhelm user
        setTimeout(() => setShow(true), 2000)
      } else if (result.state === 'granted') {
        // Already granted, get location silently
        navigator.geolocation.getCurrentPosition(
          (position) => {
            onLocationGranted?.({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          },
          () => {},
          { enableHighAccuracy: false, timeout: 5000 }
        )
      }
    }).catch(() => {
      // Permissions API not supported, show prompt anyway
      setTimeout(() => setShow(true), 2000)
    })
  }, [onLocationGranted])

  const handleRequestLocation = () => {
    setRequesting(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationGranted?.({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setShow(false)
        setRequesting(false)
      },
      () => {
        setRequesting(false)
        setShow(false)
        sessionStorage.setItem('geolocation-prompt-dismissed', 'true')
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const handleDismiss = () => {
    sessionStorage.setItem('geolocation-prompt-dismissed', 'true')
    setShow(false)
    onDismiss?.()
  }

  if (!show) return null

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Enable Location for Better Results</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Share your location to see accurate distances and find jobs near you
            </p>
            <div className="flex gap-2">
              <Button onClick={handleRequestLocation} disabled={requesting} size="sm">
                {requesting ? 'Requesting...' : 'Enable Location'}
              </Button>
              <Button onClick={handleDismiss} variant="ghost" size="sm">
                Not Now
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
