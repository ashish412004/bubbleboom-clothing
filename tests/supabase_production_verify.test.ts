import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] || ''
    value = value.trim().replace(/^['"](.*)['"]$/, '$1')
    env[match[1]] = value
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('Production Supabase Migration & RPC Verification', () => {
  it('connects to production Supabase and probes add_to_cart_atomic', async () => {
    const supabase = createClient(url, serviceKey)
    
    // Probe 1: Products table
    const startP = performance.now()
    const { data: prods, error: prodErr } = await supabase
      .from('products')
      .select('id, name, slug, selling_price, is_published, is_active')
      .eq('is_published', true)
      .eq('is_active', true)
      .limit(5)
    const durationP = performance.now() - startP
    console.log('Production Products query latency:', durationP.toFixed(2), 'ms', 'Count:', prods?.length, 'Slugs:', prods?.map(p => p.slug))
    expect(prodErr).toBeNull()

    // Probe 2: RPC add_to_cart_atomic
    const startRpc = performance.now()
    const { data: rpcData, error: rpcErr } = await supabase.rpc('add_to_cart_atomic', {
      p_variant_id: '00000000-0000-0000-0000-000000000000',
      p_quantity: 1,
      p_session_id: 'test_probe'
    })
    const durationRpc = performance.now() - startRpc
    console.log('Production add_to_cart_atomic RPC:', { rpcData, rpcErr, durationMs: durationRpc.toFixed(2) })
  })
})
