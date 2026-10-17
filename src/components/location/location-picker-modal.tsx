'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, Navigation, MapPin, Loader2, Check, AlertCircle, RefreshCw, ZoomIn, ZoomOut, Edit3 } from 'lucide-react'

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

// Neutral overview center of India for visual initialization only (NEVER treated as an address)
const DEFAULT_MAP_LAT = 20.5937
const DEFAULT_MAP_LON = 78.9629
const DEFAULT_MAP_ZOOM = 5
const VERIFIED_ZOOM = 16

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
  const isGoogleMapRef = useRef<boolean>(false)

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

  // Debounced reverse geocode ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Reverse Geocoding Function
  const resolveAddressFromCoords = useCallback(async (latitude: number, longitude: number) => {
    setIsResolvingAddress(true)
    try {
      const res = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`)
      const data = await res.json()
      if (data.success && data.address) {
        setCurrentAddress({
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
        })
      }
    } catch (err) {
      console.warn('[LocationPicker] Reverse geocode error:', err)
    } finally {
      setIsResolvingAddress(false)
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
      }, 400)
    },
    [resolveAddressFromCoords]
  )

  // 2. Request GPS Geolocation Function
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
          }
        }
        triggerReverseGeocode(lat, lon)
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

  // 3. Initialize Interactive Map on Modal Open
  useEffect(() => {
    if (!isOpen) {
      setMapReady(false)
      setIsLocationVerified(false)
      setCurrentAddress(null)
      setPermissionNote(null)
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
    const initLeafletMap = () => {
      if (!isMounted || !mapContainerRef.current) return

      // Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Load Leaflet JS
      const initL = () => {
        if (!isMounted || !mapContainerRef.current) return
        const L = (window as any).L
        if (!L) return

        if (leafletInstanceRef.current) {
          try {
            leafletInstanceRef.current.remove()
          } catch {}
        }

        const map = L.map(mapContainerRef.current, {
          center: [coords.lat, coords.lon],
          zoom: initialZoom,
          zoomControl: false,
          attributionControl: true,
        })

        // Official CARTO Voyager raster URL with API key parameter
        // If NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY is present, it passes ?key=... to remove watermarks
        const tileUrl = cartoApiKey
          ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoApiKey)}`
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

        L.tileLayer(tileUrl, {
          maxZoom: 19,
          subdomains: 'abcd',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        }).addTo(map)

        leafletInstanceRef.current = map
        isGoogleMapRef.current = false

        map.on('movestart', () => {
          setIsPanning(true)
        })

        map.on('moveend', () => {
          setIsPanning(false)
          const center = map.getCenter()
          setCoords({ lat: center.lat, lon: center.lng })
          // Moving the map signifies intentional user pin placement
          setIsLocationVerified(true)
          triggerReverseGeocode(center.lat, center.lng)
        })

        map.on('click', (e: any) => {
          setIsLocationVerified(true)
          map.panTo(e.latlng, { animate: true })
        })

        // Invalidate size once modal animation settles
        setTimeout(() => {
          map.invalidateSize()
        }, 300)

        setMapReady(true)

        // Only reverse-geocode if caller supplied real initial coordinates (e.g. edit mode or pre-detected GPS)
        if (hasInitialCoords) {
          triggerReverseGeocode(coords.lat, coords.lon)
        }
      }

      if ((window as any).L) {
        initL()
      } else {
        const script = document.createElement('script')
        script.id = 'leaflet-js'
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => initL()
        document.head.appendChild(script)
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

    // If caller didn't supply initial verified coordinates, attempt automatic GPS detection
    if (!hasInitialCoords) {
      requestCurrentLocation(true)
    }

    return () => {
      isMounted = false
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (leafletInstanceRef.current) {
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl h-[92vh] sm:h-[650px] bg-white flex flex-col rounded-t-[24px] sm:rounded-[24px] overflow-hidden shadow-2xl border border-neutral-300">
        {/* Header */}
        <div className="px-5 py-3.5 bg-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider font-mono">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location picker"
            className="p-1.5 rounded-full hover:bg-neutral-800 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Permission / Status Banner */}
        {permissionNote && (
          <div className="px-4 py-2.5 bg-neutral-100 border-b border-neutral-200 text-neutral-800 text-xs font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <AlertCircle size={15} className="shrink-0 text-black" />
              <span className="leading-snug">{permissionNote}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => requestCurrentLocation(true)}
                disabled={isLocating}
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors flex items-center gap-1 text-black cursor-pointer"
              >
                {isLocating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                <span>Retry GPS</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-black text-white rounded hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 size={12} />
                <span>Enter Manually</span>
              </button>
            </div>
          </div>
        )}

        {/* Map Area */}
        <div className="relative flex-1 w-full bg-neutral-100 overflow-hidden">
          {/* Map canvas */}
          <div ref={mapContainerRef} className="w-full h-full" tabIndex={0} />

          {/* Centered Delivery Location Pin (Swiggy / Google Maps Style) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div
              className={`relative -mt-10 flex flex-col items-center transition-transform duration-200 ${
                isPanning ? '-translate-y-3 scale-105' : 'translate-y-0 scale-100'
              }`}
            >
              {/* Delivery Pin Badge */}
              <div className="bg-black text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap mb-1 border border-white/20 select-none">
                {isLocationVerified ? 'Order will be delivered here' : 'Move map to place pin'}
              </div>

              {/* Delivery Pin Head */}
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                <MapPin size={20} className="fill-white text-white" />
              </div>
              {/* Pin Pointer Point */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black -mt-[1px]" />
              {/* Ground Shadow */}
              <div
                className={`w-3.5 h-1.5 bg-black/35 rounded-full blur-[1px] mt-0.5 transition-all duration-200 ${
                  isPanning ? 'scale-75 opacity-40' : 'scale-100 opacity-80'
                }`}
              />
            </div>
          </div>

          {/* Floating Instructions Pill */}
          <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-10 px-4">
            <div className="bg-white/95 backdrop-blur-xs border border-neutral-300 text-neutral-900 text-[11px] font-semibold tracking-wide py-1.5 px-3.5 rounded-full shadow-md flex items-center gap-1.5">
              <span>📍 Move map to adjust exact delivery point</span>
            </div>
          </div>

          {/* Map Controls: Recenter to GPS */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => requestCurrentLocation(true)}
              disabled={isLocating}
              aria-label="Recenter to my current location"
              title="Recenter to my current location"
              className="w-11 h-11 rounded-full bg-white hover:bg-black text-black hover:text-white border border-neutral-300 hover:border-black shadow-lg flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              {isLocating ? (
                <Loader2 size={18} className="animate-spin text-black" />
              ) : (
                <Navigation size={18} className="fill-current" />
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
        <div className="p-4 sm:p-5 bg-white border-t border-neutral-200 shrink-0 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
              {isResolvingAddress || isLocating ? (
                <Loader2 size={16} className="animate-spin text-black" />
              ) : (
                <MapPin size={16} className="text-black" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 font-bold mb-0.5">
                SELECTED DELIVERY LOCATION
              </p>

              {isLocating ? (
                <div className="space-y-1 py-1">
                  <p className="text-xs font-semibold text-black animate-pulse">Detecting your GPS position...</p>
                  <p className="text-[11px] text-neutral-500">Please allow browser location access</p>
                </div>
              ) : isResolvingAddress && !currentAddress ? (
                <div className="space-y-1 py-1">
                  <div className="h-4 bg-neutral-200 rounded-sm animate-pulse w-3/4" />
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
                  Move map pin or click &quot;Recenter&quot; to detect your address...
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleConfirmLocation}
              disabled={!isLocationVerified || !currentAddress || isResolvingAddress || isLocating}
              className="flex-1 bg-black text-white hover:bg-neutral-800 h-12 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md active:scale-98"
            >
              <Check size={16} />
              <span>
                {isLocating
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
              className="px-5 h-12 text-xs uppercase tracking-wider font-bold text-neutral-600 hover:text-black border border-neutral-300 hover:border-black rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
