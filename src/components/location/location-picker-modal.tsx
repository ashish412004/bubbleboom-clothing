'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, Navigation, MapPin, Loader2, Check, AlertCircle, RefreshCw, ZoomIn, ZoomOut, Edit3, Crosshair } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

export interface LocationAddressResult {
  address_line1: string
  address_line2?: string
  landmark?: string
  city: string
  state: string
  pin_code: string
  country?: string
  formatted_address?: string
  lat: number
  lon: number
}

export interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (address: LocationAddressResult) => void
  initialLat?: number
  initialLon?: number
  title?: string
}

// Neutral overview center of India for visual canvas initialization only (NEVER treated as an address)
const DEFAULT_MAP_LAT = 20.5937
const DEFAULT_MAP_LON = 78.9629
const DEFAULT_MAP_ZOOM = 5
const VERIFIED_ZOOM = 16

// In-memory reverse-geocoding cache to eliminate redundant network requests
const geocodeCache = new Map<string, LocationAddressResult>()

// Module-level cached Leaflet instance across modal toggles in the same session
let cachedLeafletModule: any = null

export function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLon,
  title = 'SELECT DELIVERY LOCATION',
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const leafletInstanceRef = useRef<any>(null)
  const accuracyCircleRef = useRef<any>(null)
  const isGoogleMapRef = useRef<boolean>(false)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const userMovedPinRef = useRef<boolean>(false)

  const hasInitialCoords = Boolean(
    typeof initialLat === 'number' &&
    typeof initialLon === 'number' &&
    !isNaN(initialLat) &&
    !isNaN(initialLon) &&
    initialLat !== 0 &&
    initialLon !== 0
  )

  // Location state
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: hasInitialCoords ? (initialLat as number) : DEFAULT_MAP_LAT,
    lon: hasInitialCoords ? (initialLon as number) : DEFAULT_MAP_LON,
  })

  // Whether the location has been explicitly confirmed via GPS or user pin movement
  const [isLocationVerified, setIsLocationVerified] = useState<boolean>(hasInitialCoords)
  const [isLocating, setIsLocating] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [currentAddress, setCurrentAddress] = useState<LocationAddressResult | null>(null)
  const [permissionNote, setPermissionNote] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false)
  const [mapReady, setMapReady] = useState(false)
  const [tileLoadError, setTileLoadError] = useState(false)

  // Debounced reverse geocode and stale response prevention refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const geocodeRequestIdRef = useRef<number>(0)

  // Background body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [isOpen])

  // 1. Reverse Geocoding Function with In-Memory Cache and Stale Request Cancellation
  const resolveAddressFromCoords = useCallback(async (latitude: number, longitude: number) => {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
    const cached = geocodeCache.get(cacheKey)
    if (cached) {
      setCurrentAddress({ ...cached, lat: latitude, lon: longitude })
      setIsResolvingAddress(false)
      return
    }

    const requestId = ++geocodeRequestIdRef.current
    setIsResolvingAddress(true)
    try {
      const res = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`)
      const data = await res.json()
      // Ignore stale response if user panned or re-located in the interim
      if (requestId !== geocodeRequestIdRef.current) {
        return
      }
      if (data.success && data.address) {
        const resolved: LocationAddressResult = {
          address_line1: data.address.address_line1 || '',
          address_line2: data.address.address_line2 || '',
          landmark: data.address.landmark || '',
          city: data.address.city || '',
          state: data.address.state || '',
          pin_code: data.address.pin_code || '',
          country: data.address.country || 'India',
          formatted_address: data.address.formatted_address || '',
          lat: latitude,
          lon: longitude,
        }
        geocodeCache.set(cacheKey, resolved)
        setCurrentAddress(resolved)
      }
    } catch (err) {
      if (requestId === geocodeRequestIdRef.current) {
        console.warn('[LocationPicker] Reverse geocode error:', err)
      }
    } finally {
      if (requestId === geocodeRequestIdRef.current) {
        setIsResolvingAddress(false)
      }
    }
  }, [])

  // Debounced trigger
  const triggerReverseGeocode = useCallback(
    (latitude: number, longitude: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        resolveAddressFromCoords(latitude, longitude)
      }, 350)
    },
    [resolveAddressFromCoords]
  )

  // 2. Request GPS Geolocation Function (Non-blocking, Asynchronous)
  const requestCurrentLocation = useCallback((panToCurrent = true) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setPermissionNote('Geolocation is not supported by your browser.')
      return
    }

    setIsLocating(true)
    setPermissionNote(null)
    setPermissionDenied(false)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const accuracy = pos.coords.accuracy

        // Only update coords if user has not manually moved the pin in the interim
        if (!userMovedPinRef.current || !panToCurrent) {
          setCoords({ lat, lon })
          setIsLocationVerified(true)
          setPermissionNote(null)
          setPermissionDenied(false)

          if (panToCurrent) {
            if (isGoogleMapRef.current && mapInstanceRef.current) {
              mapInstanceRef.current.panTo({ lat, lng: lon })
              mapInstanceRef.current.setZoom(VERIFIED_ZOOM)
            } else if (leafletInstanceRef.current) {
              leafletInstanceRef.current.setView([lat, lon], VERIFIED_ZOOM, { animate: true })

              // Display subtle GPS accuracy radius circle on the map
              const L = (window as any).L || cachedLeafletModule
              if (L && accuracy && accuracy > 0) {
                if (accuracyCircleRef.current) {
                  try {
                    leafletInstanceRef.current.removeLayer(accuracyCircleRef.current)
                  } catch {}
                }
                try {
                  accuracyCircleRef.current = L.circle([lat, lon], {
                    radius: Math.min(accuracy, 300),
                    color: '#000000',
                    fillColor: '#000000',
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: '3, 4',
                  }).addTo(leafletInstanceRef.current)
                } catch {}
              }
            }
          }
          triggerReverseGeocode(lat, lon)
        }
      },
      (err) => {
        setIsLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true)
          setPermissionNote('Location permission was denied. Please allow GPS access, or drag the map pin to select your address.')
        } else if (err.code === err.TIMEOUT) {
          setPermissionNote('GPS request timed out. Please drag the map pin to select your delivery address.')
        } else {
          setPermissionNote('Could not detect exact GPS position. Please drag the map pin to select your address.')
        }
        // NEVER reverse-geocode fallback default coordinates on GPS failure!
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [triggerReverseGeocode])

  // Helper to dynamically load Leaflet assets (bundles locally with CDN fallback)
  const loadLeafletAssets = async (): Promise<any> => {
    if (cachedLeafletModule) return cachedLeafletModule
    if (typeof window === 'undefined') return null

    if ((window as any).L) {
      cachedLeafletModule = (window as any).L
      return cachedLeafletModule
    }

    // Dynamic import from local bundle first (ultra-fast, ~0ms extra network latency)
    try {
      const mod = await import('leaflet')
      const L = mod.default || mod
      if (L) {
        cachedLeafletModule = L
        ;(window as any).L = L
        return L
      }
    } catch {
      // Fallback to CDN if dynamic import fails
    }

    return new Promise((resolve) => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if (document.getElementById('leaflet-js')) {
        const interval = setInterval(() => {
          if ((window as any).L) {
            clearInterval(interval)
            cachedLeafletModule = (window as any).L
            resolve(cachedLeafletModule)
          }
        }, 50)
        setTimeout(() => {
          clearInterval(interval)
          resolve((window as any).L || null)
        }, 3500)
        return
      }

      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        cachedLeafletModule = (window as any).L
        resolve(cachedLeafletModule)
      }
      script.onerror = () => resolve(null)
      document.head.appendChild(script)
    })
  }

  // 3. Initialize Interactive Map on Modal Open
  useEffect(() => {
    if (!isOpen) {
      setMapReady(false)
      setIsLocationVerified(false)
      setCurrentAddress(null)
      setPermissionNote(null)
      setTileLoadError(false)
      userMovedPinRef.current = false
      return
    }

    let isMounted = true
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const cartoApiKey = (process.env.NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY || '').trim()

    const initialZoom = hasInitialCoords ? VERIFIED_ZOOM : DEFAULT_MAP_ZOOM

    // Function to initialize Google Map
    const initGoogleMap = () => {
      if (!isMounted || !mapContainerRef.current || !(window as any).google?.maps) return

      try {
        isGoogleMapRef.current = true
        const gMaps = (window as any).google.maps
        const map = new gMaps.Map(mapContainerRef.current, {
          center: { lat: coords.lat, lng: coords.lon },
          zoom: initialZoom,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'all',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#000000' }],
            },
            {
              featureType: 'poi',
              stylers: [{ visibility: 'simplified' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ lightness: 20 }],
            },
          ],
        })

        mapInstanceRef.current = map

        map.addListener('dragstart', () => {
          setIsPanning(true)
          userMovedPinRef.current = true
        })

        map.addListener('dragend', () => {
          setIsPanning(false)
          const center = map.getCenter()
          if (center) {
            const newLat = center.lat()
            const newLon = center.lng()
            setCoords({ lat: newLat, lon: newLon })
            setIsLocationVerified(true)
            triggerReverseGeocode(newLat, newLon)
          }
        })

        setMapReady(true)
        if (hasInitialCoords) {
          triggerReverseGeocode(coords.lat, coords.lon)
        }
      } catch (err) {
        console.warn('[LocationPicker] Google Maps initialization notice, falling back to Leaflet:', err)
        initLeafletMap()
      }
    }

    // Function to initialize Leaflet with CARTO Basemaps API key
    const initLeafletMap = async () => {
      if (!isMounted || !mapContainerRef.current) return

      const L = await loadLeafletAssets()
      if (!isMounted || !mapContainerRef.current || !L) return

      if (leafletInstanceRef.current) {
        try {
          leafletInstanceRef.current.remove()
        } catch {}
        leafletInstanceRef.current = null
      }

      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lon],
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: true,
        tap: false,
        touchZoom: true,
        dragging: true,
        scrollWheelZoom: true,
        bounceAtZoomLimits: false,
      })

      // Official CARTO Voyager raster URL with API key parameter
      // If NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY is present, it passes ?key=... to remove watermarks
      const tileUrl = cartoApiKey
        ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoApiKey)}`
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      }).addTo(map)

      tileLayer.on('tileerror', () => {
        setTileLoadError(true)
      })

      leafletInstanceRef.current = map
      isGoogleMapRef.current = false

      map.on('movestart', () => {
        setIsPanning(true)
        userMovedPinRef.current = true
      })

      map.on('moveend', () => {
        setIsPanning(false)
        const center = map.getCenter()
        if (center) {
          setCoords({ lat: center.lat, lon: center.lng })
          // Moving the map signifies intentional user pin placement
          setIsLocationVerified(true)
          triggerReverseGeocode(center.lat, center.lng)
        }
      })

      map.on('click', (e: any) => {
        setIsLocationVerified(true)
        userMovedPinRef.current = true
        map.panTo(e.latlng, { animate: true })
      })

      // ResizeObserver to continually adapt to modal layout stabilization, window resize, or rotation
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        const ro = new ResizeObserver(() => {
          if (leafletInstanceRef.current) {
            leafletInstanceRef.current.invalidateSize({ pan: false })
          }
        })
        ro.observe(mapContainerRef.current)
        resizeObserverRef.current = ro
      }

      // Single post-transition size invalidation to avoid repeated layout recalculations
      const invalidate = () => {
        if (leafletInstanceRef.current) {
          leafletInstanceRef.current.invalidateSize({ pan: false })
        }
      }

      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(invalidate)
      }
      const postAnimTimer = setTimeout(invalidate, 250)

      setMapReady(true)

      // Only reverse-geocode if caller supplied real initial coordinates (e.g. edit mode or pre-detected GPS)
      if (hasInitialCoords) {
        triggerReverseGeocode(coords.lat, coords.lon)
      }

      return () => {
        clearTimeout(postAnimTimer)
      }
    }

    // Try Google Maps if key configured, otherwise use Leaflet with CARTO
    if (googleApiKey && googleApiKey.trim().length > 0) {
      if ((window as any).google?.maps) {
        initGoogleMap()
      } else {
        const script = document.createElement('script')
        script.id = 'google-maps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleApiKey.trim())}&libraries=geometry`
        script.onload = () => initGoogleMap()
        script.onerror = () => initLeafletMap()
        document.head.appendChild(script)
      }
    } else {
      initLeafletMap()
    }

    // Non-blocking asynchronous GPS detection on modal open when caller didn't provide coordinates
    if (!hasInitialCoords) {
      requestCurrentLocation(true)
    }

    return () => {
      isMounted = false
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (leafletInstanceRef.current) {
        if (accuracyCircleRef.current) {
          try {
            leafletInstanceRef.current.removeLayer(accuracyCircleRef.current)
          } catch {}
          accuracyCircleRef.current = null
        }
        try {
          leafletInstanceRef.current.remove()
        } catch {}
        leafletInstanceRef.current = null
      }
      mapInstanceRef.current = null
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom helpers
  const handleZoomIn = () => {
    if (isGoogleMapRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 16) + 1)
    } else if (leafletInstanceRef.current) {
      leafletInstanceRef.current.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (isGoogleMapRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 16) - 1)
    } else if (leafletInstanceRef.current) {
      leafletInstanceRef.current.zoomOut()
    }
  }

  // Handle confirmation
  const handleConfirmLocation = () => {
    if (!isLocationVerified || !currentAddress) return
    onConfirm(currentAddress)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overscroll-contain animate-in fade-in duration-200"
    >
      {/* Critical scoped CSS to prevent Tailwind preflight max-width distortion of Leaflet raster tiles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .bb-map-canvas .leaflet-pane,
        .bb-map-canvas .leaflet-tile,
        .bb-map-canvas .leaflet-marker-icon,
        .bb-map-canvas .leaflet-marker-shadow,
        .bb-map-canvas .leaflet-tile-container,
        .bb-map-canvas .leaflet-pane > svg,
        .bb-map-canvas .leaflet-pane > canvas,
        .bb-map-canvas .leaflet-zoom-box,
        .bb-map-canvas .leaflet-image-layer,
        .bb-map-canvas .leaflet-layer {
          position: absolute !important;
          left: 0;
          top: 0;
        }
        .bb-map-canvas .leaflet-tile-pane {
          position: absolute !important;
          left: 0;
          top: 0;
          z-index: 200;
        }
        .bb-map-canvas .leaflet-tile-container {
          position: absolute !important;
          left: 0;
          top: 0;
        }
        .bb-map-canvas .leaflet-tile {
          max-width: none !important;
          max-height: none !important;
          width: 256px !important;
          height: 256px !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          box-shadow: none !important;
        }
        .bb-map-canvas .leaflet-pane img {
          max-width: none !important;
          max-height: none !important;
        }
        .bb-map-canvas .leaflet-tile-container img {
          max-width: none !important;
          max-height: none !important;
        }
        .bb-map-canvas .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background-color: #f4f3f0 !important;
          outline: none !important;
          touch-action: pan-x pan-y !important;
        }
      ` }} />

      <div className="relative w-[calc(100vw-24px)] sm:w-full max-w-2xl max-h-[82dvh] sm:max-h-[620px] bg-white flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-neutral-300">
        {/* Header */}
        <div className="px-4 py-3 bg-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider font-mono">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location picker"
            className="p-1 rounded-full hover:bg-neutral-800 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Permission / Status Banner */}
        {permissionNote && (
          <div className="px-3.5 py-2 bg-neutral-100 border-b border-neutral-200 text-neutral-800 text-[11px] sm:text-xs font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <AlertCircle size={14} className="shrink-0 text-black" />
              <span className="leading-snug line-clamp-2">{permissionNote}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  userMovedPinRef.current = false
                  requestCurrentLocation(true)
                }}
                disabled={isLocating}
                className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors flex items-center gap-1 text-black cursor-pointer"
              >
                {isLocating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                <span>Retry GPS</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 bg-black text-white rounded hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 size={11} />
                <span>Enter Manually</span>
              </button>
            </div>
          </div>
        )}

        {/* Tile Loading Error Notice */}
        {tileLoadError && (
          <div className="px-3.5 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2 shrink-0">
            <span>Slow connection: Some map tiles took longer to render.</span>
            <button
              type="button"
              onClick={() => {
                setTileLoadError(false)
                if (leafletInstanceRef.current) {
                  leafletInstanceRef.current.invalidateSize({ pan: false })
                }
              }}
              className="text-[10px] font-bold underline cursor-pointer"
            >
              Refresh Tiles
            </button>
          </div>
        )}

        {/* Map Area */}
        <div className="relative flex-1 w-full min-h-[220px] h-[38dvh] sm:h-[360px] bg-[#f4f3f0] overflow-hidden">
          {/* Lightweight non-blocking skeleton loader while Leaflet initializes */}
          {!mapReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#f4f3f0]/90 backdrop-blur-xs">
              <Loader2 size={24} className="animate-spin text-black mb-2" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                Loading interactive map...
              </span>
            </div>
          )}

          {/* Map canvas with improved contrast/brightness for clearer roads & buildings */}
          <div
            ref={mapContainerRef}
            className="bb-map-canvas w-full h-full relative z-0 [&_.leaflet-tile-pane]:contrast-[1.12] [&_.leaflet-tile-pane]:brightness-[0.98] [&_.leaflet-tile-pane]:saturate-[1.15] [&_.leaflet-tile]:!max-w-none [&_.leaflet-tile]:!max-h-none [&_.leaflet-pane_img]:!max-w-none [&_.leaflet-tile-container_img]:!max-w-none"
            tabIndex={0}
          />

          {/* 1. Precision Centered Delivery Location Pin (Black Pin with White Center Dot) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-30 select-none">
            <div
              className={`flex flex-col items-center transition-transform duration-200 ease-out ${
                isPanning ? '-translate-y-2.5 scale-105' : 'translate-y-0 scale-100'
              }`}
            >
              {/* Delivery Pin Badge */}
              <div className="bg-black text-white text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-2xl whitespace-nowrap mb-1 border border-white/30 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isLocationVerified ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span>
                  {isPanning
                    ? 'Locating point...'
                    : isLocationVerified
                    ? 'Order will be delivered here'
                    : 'Move map to place pin'}
                </span>
              </div>

              {/* Pin Head: Solid Black Teardrop with White Center */}
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-black rounded-full shadow-2xl border-[3px] border-white flex items-center justify-center">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full flex items-center justify-center shadow-inner">
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                  </div>
                </div>
                {/* Pointer Pointing Directly at Geographic Target */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[9px] border-t-black -mt-[2px]" />
              </div>

              {/* Ground Shadow Point */}
              <div
                className={`w-3 h-1 bg-black/40 rounded-full blur-[1px] transition-all duration-200 ${
                  isPanning ? 'scale-50 opacity-20 translate-y-2' : 'scale-100 opacity-70 translate-y-0'
                }`}
              />
            </div>
          </div>

          {/* Hidden reference for MapPin icon import compatibility */}
          <span className="sr-only"><MapPin size={0} /></span>

          {/* Floating Instructions Pill */}
          <div className="absolute top-2.5 left-3 sm:top-3 sm:left-4 pointer-events-none z-20">
            <div className="bg-white/95 backdrop-blur-xs border border-neutral-300 text-neutral-900 text-[10px] sm:text-[11px] font-semibold tracking-wide py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-full shadow-md flex items-center gap-1.5">
              <span>📍 Move map to adjust exact delivery point</span>
            </div>
          </div>

          {/* 2. Floating "USE CURRENT LOCATION" Action Button */}
          <div className="absolute top-2.5 right-3 sm:top-3 sm:right-4 z-20">
            <button
              type="button"
              onClick={() => {
                userMovedPinRef.current = false
                requestCurrentLocation(true)
              }}
              disabled={isLocating}
              aria-label="Use Current Location"
              title="Detect and use my current location"
              className="bg-black hover:bg-neutral-800 text-white border border-neutral-700 shadow-xl px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            >
              {isLocating ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <Crosshair size={13} className="text-white" />
              )}
              <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
            </button>
          </div>

          {/* Map Controls: Floating Recenter & Desktop Zoom Buttons */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex flex-col gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                userMovedPinRef.current = false
                requestCurrentLocation(true)
              }}
              disabled={isLocating}
              aria-label="Recenter to my current location"
              title="Recenter to my current location"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-black text-black hover:text-white border border-neutral-300 hover:border-black shadow-lg flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              {isLocating ? (
                <Loader2 size={16} className="animate-spin text-black" />
              ) : (
                <Navigation size={16} className="fill-current" />
              )}
            </button>

            {/* Desktop Zoom In/Out */}
            <div className="hidden sm:flex flex-col bg-white border border-neutral-300 rounded-xl shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={handleZoomIn}
                aria-label="Zoom in"
                className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 text-black border-b border-neutral-200 transition-colors cursor-pointer"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                aria-label="Zoom out"
                className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 text-black transition-colors cursor-pointer"
              >
                <ZoomOut size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Address Confirmation Panel */}
        <div className="p-3.5 sm:p-5 bg-white border-t border-neutral-200 shrink-0 space-y-2.5 sm:space-y-3.5 pb-[max(env(safe-area-inset-bottom),0.875rem)]">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
              {isResolvingAddress || isLocating ? (
                <Loader2 size={14} className="animate-spin text-black" />
              ) : (
                <div className="w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase font-mono tracking-widest text-neutral-500 font-bold mb-0.5">
                SELECTED DELIVERY LOCATION
              </p>

              {isLocating && !isLocationVerified ? (
                <div className="space-y-0.5 py-0.5">
                  <p className="text-xs font-semibold text-black animate-pulse">Detecting your GPS position...</p>
                  <p className="text-[11px] text-neutral-500">Please allow browser location access</p>
                </div>
              ) : isPanning ? (
                <div className="space-y-0.5 py-0.5">
                  <p className="text-xs font-semibold text-black">Updating pin location...</p>
                  <p className="text-[11px] text-neutral-500">Release map to select address</p>
                </div>
              ) : isResolvingAddress && !currentAddress ? (
                <div className="space-y-1 py-1">
                  <div className="h-3.5 bg-neutral-200 rounded-sm animate-pulse w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded-sm animate-pulse w-1/2" />
                </div>
              ) : isLocationVerified && currentAddress ? (
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-black uppercase tracking-tight line-clamp-1">
                    {currentAddress.address_line1 || currentAddress.city || 'Location Pin Dropped'}
                  </h3>
                  <p className="text-[11px] text-neutral-600 line-clamp-1 mt-0.5">
                    {[currentAddress.city, currentAddress.state, currentAddress.pin_code]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 italic">
                  Move map pin or click &quot;Use Current Location&quot; to detect your address...
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleConfirmLocation}
              disabled={!isLocationVerified || !currentAddress || isResolvingAddress || isLocating}
              className="flex-1 bg-black text-white hover:bg-neutral-800 h-11 sm:h-12 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md active:scale-98"
            >
              <Check size={16} />
              <span>
                {isLocating && !isLocationVerified
                  ? 'DETECTING LOCATION...'
                  : isResolvingAddress
                  ? 'RESOLVING ADDRESS...'
                  : !isLocationVerified
                  ? 'SELECT LOCATION ON MAP TO CONFIRM'
                  : 'CONFIRM DELIVERY LOCATION'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 h-11 sm:h-12 text-xs uppercase tracking-wider font-bold text-neutral-600 hover:text-black border border-neutral-300 hover:border-black rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
