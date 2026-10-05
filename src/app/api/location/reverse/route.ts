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
      city: string
      state: string
      pin_code: string
      formatted_address?: string
    } | null = null

    // 1. Try OpenStreetMap Nominatim with proper User-Agent
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      const res = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'BubbleBoomClothing/1.0 (contact@bubbleboom.in)',
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

        const detectedLine1 = streetParts.length > 0
          ? streetParts.join(', ')
          : (a.locality || a.village || a.town || '')

        const detectedCity = a.city || a.town || a.village || a.city_district || a.state_district || a.county || ''
        const detectedState = a.state || ''
        const detectedPincode = (a.postcode || '').replace(/\D/g, '').slice(0, 6)

        addressData = {
          address_line1: detectedLine1,
          city: detectedCity,
          state: detectedState,
          pin_code: detectedPincode,
          formatted_address: data.display_name || '',
        }
      }
    } catch (nomErr) {
      console.warn('Nominatim reverse geocode notice:', nomErr)
    }

    // 2. Fallback to BigDataCloud if Nominatim had no data
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
            formatted_address: `${bdc.locality || ''}, ${bdc.city || ''}, ${bdc.principalSubdivision || ''}`.trim(),
          }
        }
      } catch (bdcErr) {
        console.warn('BigDataCloud reverse geocode notice:', bdcErr)
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
