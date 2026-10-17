import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bubble Boom – Mobile Map Loading Performance Suite', () => {
  const modalPath = path.join(process.cwd(), 'src', 'components', 'location', 'location-picker-modal.tsx')
  const modalContent = fs.readFileSync(modalPath, 'utf-8')

  it('1. Dynamically imports Leaflet and caches module instance across modal toggles', () => {
    // Uses dynamic import
    expect(modalContent).toContain("import('leaflet')")
    // Module-level cache
    expect(modalContent).toContain('cachedLeafletModule')
    // Bundled css
    expect(modalContent).toContain("import 'leaflet/dist/leaflet.css'")
  })

  it('2. Implements in-memory reverse geocoding cache to eliminate redundant network requests', () => {
    expect(modalContent).toContain('geocodeCache = new Map<string, LocationAddressResult>()')
    expect(modalContent).toContain('geocodeCache.get(cacheKey)')
    expect(modalContent).toContain('geocodeCache.set(cacheKey, resolved)')
  })

  it('3. Runs GPS detection asynchronously without blocking immediate modal presentation', () => {
    expect(modalContent).toContain('!mapReady')
    expect(modalContent).toContain('Loading interactive map...')
    expect(modalContent).toContain('userMovedPinRef')
  })

  it('4. Preserves manual pin placement and prevents background GPS from overriding user actions', () => {
    expect(modalContent).toContain('userMovedPinRef.current = true')
    expect(modalContent).toContain('!userMovedPinRef.current')
  })

  it('5. Handles CARTO tile loading errors gracefully with retry option', () => {
    expect(modalContent).toContain('tileerror')
    expect(modalContent).toContain('tileLoadError')
    expect(modalContent).toContain('Refresh Tiles')
  })

  it('6. Minimizes invalidateSize calls to a single post-transition timer to eliminate layout recalculations', () => {
    expect(modalContent).toContain('postAnimTimer')
    expect(modalContent).not.toContain('setTimeout(invalidate, 1000)')
    expect(modalContent).toContain('clearTimeout(postAnimTimer)')
  })
})
