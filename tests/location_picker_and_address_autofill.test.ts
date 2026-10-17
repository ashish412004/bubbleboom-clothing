import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Google Maps Style Location Picker & Address Autofill Suite', () => {
  const modalComponentPath = path.join(process.cwd(), 'src', 'components', 'location', 'location-picker-modal.tsx')
  const apiRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'location', 'reverse', 'route.ts')
  const checkoutFormPath = path.join(process.cwd(), 'src', 'app', 'checkout', 'checkout-form.tsx')
  const addressManagerPath = path.join(process.cwd(), 'src', 'app', 'account', 'addresses', 'address-manager.tsx')

  const modalContent = fs.readFileSync(modalComponentPath, 'utf-8')
  const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf-8')
  const checkoutContent = fs.readFileSync(checkoutFormPath, 'utf-8')
  const addressContent = fs.readFileSync(addressManagerPath, 'utf-8')

  it('1. LocationPickerModal exists, exports required types, and adheres to Bubble Boom aesthetic', () => {
    expect(fs.existsSync(modalComponentPath)).toBe(true)
    expect(modalContent).toContain("'use client'")
    expect(modalContent).toContain('export function LocationPickerModal')
    expect(modalContent).toContain('export interface LocationAddressResult')
    expect(modalContent).toContain('export interface LocationPickerModalProps')

    // Clean monochrome styling
    expect(modalContent).toContain('bg-black text-white')
    expect(modalContent).toContain('border-neutral-200')
    expect(modalContent).toContain('CONFIRM DELIVERY LOCATION')
  })

  it('2. Map UI includes centered delivery pin, lift animation, and delivery badge pill', () => {
    // Centered pin
    expect(modalContent).toContain('Order will be delivered here')
    expect(modalContent).toContain('MapPin')
    // Dynamic lift on pan
    expect(modalContent).toContain('isPanning')
    expect(modalContent).toContain('translate-y')
    // Instructions pill
    expect(modalContent).toContain('Move map to adjust exact delivery point')
    // Recenter GPS button & zoom controls
    expect(modalContent).toContain('requestCurrentLocation')
    expect(modalContent).toContain('handleZoomIn')
    expect(modalContent).toContain('handleZoomOut')
  })

  it('3. Dual-provider map engine: Google Maps JS API + Leaflet/Carto zero-key fallback', () => {
    // Google Maps API check
    expect(modalContent).toContain('process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    expect(modalContent).toContain('initGoogleMap')
    // Leaflet fallback check
    expect(modalContent).toContain('initLeafletMap')
    expect(modalContent).toContain('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png')
    // Debounced reverse geocode (idle/panend)
    expect(modalContent).toContain('triggerReverseGeocode')
    expect(modalContent).toContain('/api/location/reverse?lat=')
  })

  it('4. Reverse geocoding API route handles validation, Google Maps API, and multi-tier fallbacks', () => {
    expect(fs.existsSync(apiRoutePath)).toBe(true)
    expect(apiRouteContent).toContain('export async function GET')
    expect(apiRouteContent).toContain('Latitude and Longitude parameters are required.')
    expect(apiRouteContent).toContain('Invalid coordinates provided.')
    // Google Maps Geocoding integration
    expect(apiRouteContent).toContain('https://maps.googleapis.com/maps/api/geocode/json')
    // Fallback geocoding (Nominatim / BigDataCloud)
    expect(apiRouteContent).toContain('https://nominatim.openstreetmap.org/reverse')
    expect(apiRouteContent).toContain('https://api.bigdatacloud.net/data/reverse-geocode-client')
    // Structured address payload
    expect(apiRouteContent).toContain('address_line1')
    expect(apiRouteContent).toContain('city')
    expect(apiRouteContent).toContain('state')
    expect(apiRouteContent).toContain('pin_code')
    expect(apiRouteContent).toContain('formatted_address')
  })

  it('5. Checkout form integrates LocationPickerModal and "Use Current Location" button', () => {
    expect(checkoutContent).toContain("import { LocationPickerModal, LocationAddressResult } from '@/components/location/location-picker-modal'")
    expect(checkoutContent).toContain('isLocationModalOpen')
    expect(checkoutContent).toContain('handleConfirmLocation')
    expect(checkoutContent).toContain('<LocationPickerModal')

    // Geolocation trigger with enableHighAccuracy
    expect(checkoutContent).toContain('navigator.geolocation.getCurrentPosition')
    expect(checkoutContent).toContain('enableHighAccuracy: true')

    // Preserves cart items, applied coupons, and payment method
    expect(checkoutContent).toContain('couponDiscountPaise')
    expect(checkoutContent).toContain('paymentMethod')

    // Address fields auto-populated cleanly
    expect(checkoutContent).toContain('setAddressLine1(loc.address_line1)')
    expect(checkoutContent).toContain('setCity(loc.city)')
    expect(checkoutContent).toContain('setState(matchedState || loc.state)')
    expect(checkoutContent).toContain('setPinCode(loc.pin_code)')
    expect(checkoutContent).toContain('handlePinChange(loc.pin_code)')

    // User prompt to complete flat/house details
    expect(checkoutContent).toContain('Location selected! Please complete your flat/building details.')
  })

  it('6. Account Address Manager integrates LocationPickerModal for Add and Edit Address flows', () => {
    expect(addressContent).toContain("import { LocationPickerModal, LocationAddressResult } from '@/components/location/location-picker-modal'")
    expect(addressContent).toContain('isLocationModalOpen')
    expect(addressContent).toContain('handleConfirmLocation')
    expect(addressContent).toContain('<LocationPickerModal')

    // Handles both Add and Edit
    expect(addressContent).toContain('isEditModeModal')
    expect(addressContent).toContain('setEditLine1(loc.address_line1)')
    expect(addressContent).toContain('setLine1(loc.address_line1)')
    expect(addressContent).toContain('setEditPinCode(loc.pin_code)')
    expect(addressContent).toContain('setPinCode(loc.pin_code)')
  })

  it('7. Integrates official NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY with key param and attribution', () => {
    expect(modalContent).toContain('NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY')
    expect(modalContent).toContain('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=')
    expect(modalContent).toContain('CARTO')
    expect(modalContent).toContain('OpenStreetMap')
  })

  it('8. Eliminates arbitrary Mumbai/Hallow Pul fallback selection and locks confirmation until verified', () => {
    // Default coordinates are neutral India overview rather than Mumbai
    expect(modalContent).not.toContain('const DEFAULT_LAT = 19.076')
    expect(modalContent).not.toContain('const DEFAULT_LON = 72.8777')
    // Confirmation disabled when location is not verified
    expect(modalContent).toContain('isLocationVerified')
    expect(modalContent).toContain('disabled={!isLocationVerified || !currentAddress || isResolvingAddress || isLocating}')
  })

  it('9. Provides actionable recovery options (Retry GPS & Enter Manually) on GPS failure', () => {
    expect(modalContent).toContain('Retry GPS')
    expect(modalContent).toContain('Enter Manually')
    expect(modalContent).toContain('permissionNote')
  })

  it('10. Uses modern GPS accuracy parameters: enableHighAccuracy, timeout 10000ms, and maximumAge 0', () => {
    expect(modalContent).toContain('enableHighAccuracy: true')
    expect(modalContent).toContain('maximumAge: 0')
    expect(modalContent).toContain('timeout: 10000')
    expect(checkoutContent).toContain('maximumAge: 0')
    expect(addressContent).toContain('maximumAge: 0')
  })

  it('11. Renders high-visibility monochrome pin, floating Use Current Location button, and sharpened map tiles', () => {
    // Monochrome pin with white center
    expect(modalContent).toContain('Pin Head: Solid Black Teardrop with White Center')
    expect(modalContent).toContain('Pointer Pointing Directly at Geographic Target')
    // Floating "Use Current Location" action button inside map
    expect(modalContent).toContain('Use Current Location')
    expect(modalContent).toContain('Crosshair')
    // Leaflet GPS accuracy circle
    expect(modalContent).toContain('accuracyCircleRef')
    // Enhanced map contrast and saturation
    expect(modalContent).toContain('contrast-[1.12]')
    expect(modalContent).toContain('brightness-[0.98]')
    expect(modalContent).toContain('saturate-[1.15]')
    // Mobile safe-area inset
    expect(modalContent).toContain('env(safe-area-inset-bottom)')
  })

  it('12. Enforces compact mobile modal layout and avoids oversized 92vh height', () => {
    // Compact mobile width and constrained max-height
    expect(modalContent).toContain('w-[calc(100vw-24px)]')
    expect(modalContent).toContain('max-h-[82dvh]')
    expect(modalContent).toContain('rounded-2xl')
    // Background scroll lock
    expect(modalContent).toContain("document.body.style.overflow = 'hidden'")
  })

  it('13. Enforces scoped Leaflet tile styling to prevent grey map distortion from Tailwind preflight', () => {
    expect(modalContent).toContain('max-width: none !important')
    expect(modalContent).toContain('width: 256px !important')
    expect(modalContent).toContain('height: 256px !important')
    expect(modalContent).toContain('position: absolute !important')
    expect(modalContent).toContain('resizeObserverRef')
    expect(modalContent).toContain('ResizeObserver')
  })

  it('14. Prevents race conditions and stale reverse-geocode responses from overwriting newer pin locations', () => {
    expect(modalContent).toContain('geocodeRequestIdRef')
    expect(modalContent).toContain('requestId !== geocodeRequestIdRef.current')
  })
})



