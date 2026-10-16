import { describe, it, expect } from 'vitest'
import fs from 'fs'

const PROD_URL = 'https://bubbleboom-clothing.vercel.app'

describe('Production Performance Real Latency Benchmark', () => {
  async function measureUrl(path: string, options?: RequestInit, runs: number = 3) {
    const durations: number[] = []
    let lastHeaders: Headers | null = null
    let lastStatus = 0

    for (let i = 0; i < runs; i++) {
      const start = performance.now()
      try {
        const res = await fetch(`${PROD_URL}${path}`, {
          ...options,
          headers: {
            'User-Agent': 'BubbleBoom-PerfBenchmark/1.0',
            ...(options?.headers || {})
          }
        })
        const duration = performance.now() - start
        durations.push(duration)
        lastHeaders = res.headers
        lastStatus = res.status
        await res.text() // read body fully
      } catch (err) {
        console.error(`Fetch error on ${path}:`, err)
      }
    }

    durations.sort((a, b) => a - b)
    const p50 = durations[Math.floor(durations.length * 0.5)]
    const p95 = durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1]
    const cacheHeader = lastHeaders?.get('x-vercel-cache') || lastHeaders?.get('cf-cache-status') || 'N/A'

    return {
      path,
      status: lastStatus,
      runs: durations.length,
      cold: durations[durations.length - 1], // typically first or slowest
      warm: durations[0], // fastest
      p50,
      p95,
      cacheHeader
    }
  }

  it('measures Homepage live response time and Vercel edge cache status', async () => {
    const res = await measureUrl('/', undefined, 4)
    console.log('BENCHMARK Homepage (/):', res)
    expect(res.status).toBe(200)
  }, 30000)

  it('measures Shop All live response time and Vercel cache status', async () => {
    const res = await measureUrl('/shop', undefined, 4)
    console.log('BENCHMARK Shop All (/shop):', res)
    expect(res.status).toBe(200)
  }, 30000)

  it('measures Categories listing live response time', async () => {
    const res = await measureUrl('/categories', undefined, 4)
    console.log('BENCHMARK Categories (/categories):', res)
    expect(res.status).toBe(200)
  }, 30000)

  it('measures Product Detail live response time', async () => {
    // Probe real production product detail page
    const res = await measureUrl('/products/bubble-boom-monochrome-chunky-sneakers', undefined, 4)
    console.log('BENCHMARK Product Detail (/products/bubble-boom-monochrome-chunky-sneakers):', res)
    expect(res.status).toBe(200)
  }, 30000)

  it('measures Cart API live response time', async () => {
    const res = await measureUrl('/api/cart', undefined, 3)
    console.log('BENCHMARK Cart API (/api/cart):', res)
    expect(res.status).toBe(200)
  }, 30000)

  it('measures Wishlist API live response time', async () => {
    const res = await measureUrl('/api/wishlist', undefined, 3)
    console.log('BENCHMARK Wishlist API (/api/wishlist):', res)
    expect(res.status).toBe(200)
  }, 30000)
})
