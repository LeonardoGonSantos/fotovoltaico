import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadGoogleMaps } from '../services/googleMapsLoader'
import type { LatLngPoint } from '../types/domain'

const DEFAULT_LIBRARIES = ['places', 'geometry', 'drawing']

export function useGoogleMapsApi(libraries: string[] = DEFAULT_LIBRARIES) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(apiKey ? 'idle' : 'error')
  const [error, setError] = useState<Error | null>(null)
  const googleRef = useRef<typeof google | null>(typeof window !== 'undefined' ? window.google ?? null : null)
  const libs = useMemo(() => libraries, [libraries])

  useEffect(() => {
    if (!apiKey) {
      setError(new Error('GOOGLE_MAPS_API_KEY não definido no .env'))
      setStatus('error')
      return
    }
    if (googleRef.current) {
      setStatus('ready')
      return
    }

    let cancelled = false
    setStatus('loading')

    loadGoogleMaps({ apiKey, libraries: libs })
      .then((gmaps) => {
        if (cancelled) return
        googleRef.current = gmaps
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, libs])

  return { status, error, google: googleRef.current }
}

interface UseGoogleMapOptions {
  center: LatLngPoint
  zoom?: number
  mapTypeId?: google.maps.MapTypeId
  disableDefaultUI?: boolean
  tilt?: number
}

export function useGoogleMapInstance(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseGoogleMapOptions
) {
  const { google, status, error } = useGoogleMapsApi()
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (status !== 'ready' || !google || mapRef.current || !containerRef.current) {
      return
    }

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: options.center,
      zoom: options.zoom ?? 20,
      mapTypeId: options.mapTypeId ?? google.maps.MapTypeId.SATELLITE,
      disableDefaultUI: options.disableDefaultUI ?? false,
      tilt: options.tilt ?? 0,
    })
  }, [status, google, containerRef, options.center, options.zoom, options.mapTypeId, options.disableDefaultUI, options.tilt])

  const setCenter = useCallback(
    (position: LatLngPoint, zoom?: number) => {
      const map = mapRef.current
      if (!map) return
      map.panTo(position)
      if (zoom) {
        map.setZoom(zoom)
      }
    },
    []
  )

  const setTilt = useCallback((tilt: number) => {
    mapRef.current?.setTilt(tilt)
  }, [])

  const map = mapRef.current

  return useMemo(
    () => ({ map, status, error, setCenter, setTilt }),
    [map, status, error, setCenter, setTilt]
  )
}
