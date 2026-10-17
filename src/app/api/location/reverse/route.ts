import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Latitude and Longitude parameters are required.' }, { status: 400 })
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({ error: 'Invalid coordinates provided.' }, { status: 400 })
    }

    let addressData: {
      address_line1: string
      address_line2?: string
      city: string
      state: string
      pin_code: string
      country?: string
      formatted_address?: string
      lat?: number
      lon?: number
    } | null = null

    // Priority 1: Google Maps Geocoding Platform (if API key configured)
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (googleApiKey && googleApiKey.trim().length > 0) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(googleApiKey.trim())}`
        const gRes = await fetch(googleUrl, { next: { revalidate: 3600 } })
        if (gRes.ok) {
          const gData = await gRes.json()
          if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
            const firstResult = gData.results[0]
            const comps = firstResult.address_components || []

            const getComp = (type: string) =>
              comps.find((c: any) => c.types && c.types.includes(type))?.long_name || ''

            const premise = getComp('premise') || getComp('subpremise')
            const streetNumber = getComp('street_number')
            const route = getComp('route')
            const sublocality =
              getComp('sublocality_level_1') ||
              getComp('sublocality') ||
              getComp('neighborhood')
            const city =
              getComp('locality') ||
              getComp('administrative_area_level_2') ||
              sublocality
            const state = getComp('administrative_area_level_1')
            const pinCode = (getComp('postal_code') || '').replace(/\D/g, '').slice(0, 6)
            const country = getComp('country') || 'India'

            const lineParts = [premise, streetNumber, route, sublocality].filter(Boolean)
            const addressLine1 = lineParts.length > 0 ? lineParts.join(', ') : sublocality || city

            if (city || state || pinCode) {
              addressData = {
                address_line1: addressLine1,
                city,
                state,
                pin_code: pinCode,
                country,
                formatted_address: firstResult.formatted_address || '',
                lat: latitude,
                lon: longitude,
              }
            }
          }
        }
      } catch (gErr) {
        console.warn('[Location API] Google Maps Geocoding notice:', gErr)
      }
    }

    // Priority 2: OpenStreetMap Nominatim with proper User-Agent & Contact
    if (!addressData || !addressData.city) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
        const res = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'BubbleBoomClothing/1.0 (bubbleboomstore2026@gmail.com)',
            'Accept-Language': 'en',
          },
          next: { revalidate: 3600 },
        })

        if (res.ok) {
          const data = await res.json()
          const a = data.address || {}

          // Construct clean street/area line
          const streetParts = [
            a.house_number,
            a.building,
            a.road || a.pedestrian || a.street,
            a.neighbourhood || a.suburb || a.residential || a.subdistrict,
          ].filter(Boolean)

          const detectedLine1 =
            streetParts.length > 0
              ? streetParts.join(', ')
              : a.locality || a.village || a.town || ''

          const detectedCity =
            a.city ||
            a.town ||
            a.village ||
            a.city_district ||
            a.state_district ||
            a.county ||
            ''
          const detectedState = a.state || ''
          const detectedPincode = (a.postcode || '').replace(/\D/g, '').slice(0, 6)
          const detectedCountry = a.country || 'India'

          addressData = {
            address_line1: detectedLine1,
            city: detectedCity,
            state: detectedState,
            pin_code: detectedPincode,
            country: detectedCountry,
            formatted_address: data.display_name || '',
            lat: latitude,
            lon: longitude,
          }
        }
      } catch (nomErr) {
        console.warn('[Location API] Nominatim reverse geocode notice:', nomErr)
      }
    }

    // Priority 3: Fallback to BigDataCloud if still missing fields
    if (!addressData || !addressData.city) {
      try {
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        const bdcRes = await fetch(bdcUrl)
        if (bdcRes.ok) {
          const bdc = await bdcRes.json()
          addressData = {
            address_line1: bdc.locality || bdc.principalSubdivision || '',
            city: bdc.city || bdc.locality || '',
            state: bdc.principalSubdivision || '',
            pin_code: (bdc.postcode || '').replace(/\D/g, '').slice(0, 6),
            country: bdc.countryName || 'India',
            formatted_address: `${bdc.locality || ''}, ${bdc.city || ''}, ${bdc.principalSubdivision || ''}`.trim(),
            lat: latitude,
            lon: longitude,
          }
        }
      } catch (bdcErr) {
        console.warn('[Location API] BigDataCloud reverse geocode notice:', bdcErr)
      }
    }

    if (!addressData) {
      return NextResponse.json({ error: 'Unable to resolve address for this location.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      address: addressData,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Reverse geocoding failed' }, { status: 500 })
  }
}
