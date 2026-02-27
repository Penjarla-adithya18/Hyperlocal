'use client'

import { useRef, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin } from 'lucide-react'

interface LocationInputProps {
  value: string
  onChange: (value: string, latLng?: { lat: number; lng: number }) => void
  placeholder?: string
  id?: string
  required?: boolean
  className?: string
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (el: HTMLInputElement, opts?: Record<string, unknown>) => {
            addListener: (event: string, callback: () => void) => void
            getPlace: () => { formatted_address?: string; geometry?: { location: { lat: () => number; lng: () => number } } }
          }
        }
      }
    }
  }
}

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const ENABLE_MAPS_ON_LOCALHOST = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_MAPS_LOCALHOST === 'true'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function fetchMapsApiKeyFromBackend(): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return ''

  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: 'maps-config' }),
  })

  const data = (await response.json().catch(() => ({}))) as {
    success?: boolean
    mapsApiKey?: string
  }

  if (!response.ok || !data?.success || !data?.mapsApiKey) return ''
  return data.mapsApiKey
}

function loadGoogleMaps(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return }
    const existing = document.getElementById('google-maps-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')))
      return
    }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps script failed to load'))
    document.head.appendChild(script)
  })
}

/**
 * Smart location input:
 * - When NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set: uses Google Places Autocomplete
 *   (all place types: cities, neighbourhoods, streets, landmarks, businesses)
 * - Otherwise: plain text input (still works fine)
 */
export function LocationInput({ value, onChange, placeholder, id, required, className }: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [initialized, setInitialized] = useState(false)
  const [mapsBlocked, setMapsBlocked] = useState(false)
  const [resolvedMapsKey, setResolvedMapsKey] = useState(MAPS_API_KEY)

  useEffect(() => {
    if (MAPS_API_KEY || resolvedMapsKey) return
    let cancelled = false

    fetchMapsApiKeyFromBackend()
      .then((backendKey) => {
        if (cancelled || !backendKey) return
        setResolvedMapsKey(backendKey)
      })
      .catch(() => {
        // keep plain input fallback
      })

    return () => {
      cancelled = true
    }
  }, [resolvedMapsKey])

  useEffect(() => {
    if (!resolvedMapsKey || initialized || mapsBlocked) return

    const host = window.location.hostname
    const isLocalhost = host === 'localhost' || host === '127.0.0.1'
    if (isLocalhost && !ENABLE_MAPS_ON_LOCALHOST) {
      setMapsBlocked(true)
      return
    }

    loadGoogleMaps(resolvedMapsKey)
      .then(() => {
        if (!inputRef.current || !window.google?.maps?.places) return
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['formatted_address', 'geometry'],
        })
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          const address = place.formatted_address ?? inputRef.current?.value ?? ''
          const latLng = place.geometry
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : undefined
          onChange(address, latLng)
        })
        setInitialized(true)
      })
      .catch(() => {
        setMapsBlocked(true)
      })
  }, [onChange, initialized, mapsBlocked, resolvedMapsKey])

  return (
    <div className={`relative ${className ?? ''}`}>
      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        id={id}
        className="pl-10"
        placeholder={placeholder ?? 'City, Area'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete="off"
      />
    </div>
  )
}
