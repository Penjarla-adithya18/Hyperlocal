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

function loadGoogleMaps(key: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps?.places) { resolve(); return }
    const existing = document.getElementById('google-maps-script')
    if (existing) { existing.addEventListener('load', () => resolve()); return }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
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

  useEffect(() => {
    if (!MAPS_API_KEY || initialized) return
    loadGoogleMaps(MAPS_API_KEY).then(() => {
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
  }, [onChange, initialized])

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
