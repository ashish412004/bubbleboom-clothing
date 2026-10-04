import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { validateIndianPhone, validateIndianPinCode } from '@/lib/orders'
import { cookies } from 'next/headers'

function getDevAddresses(cookieStore: any): any[] {
  try {
    const raw = cookieStore.get('bb_dev_addresses')?.value
    if (raw) return JSON.parse(raw)
  } catch {}
  return [
    {
      id: 'addr-dev-1',
      full_name: 'Bubble Boom Member',
      phone: '9876543210',
      address_line1: 'Flat 402, Boom Street',
      address_line2: 'Sector 15',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      country: 'IN',
      is_default: true,
      created_at: new Date().toISOString(),
    },
  ]
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured()) {
      const cookieStore = await cookies()
      const addresses = getDevAddresses(cookieStore)
      return NextResponse.json({ success: true, addresses })
    }

    const supabase = await createServerClient()
    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, addresses: addresses || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { full_name, phone, address_line1, address_line2, city, state, pin_code, is_default } = body

    if (!full_name || !phone || !address_line1 || !city || !state || !pin_code) {
      return NextResponse.json({ error: 'Please fill in all required address fields.' }, { status: 400 })
    }

    if (!validateIndianPhone(phone)) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit Indian phone number.' }, { status: 400 })
    }

    if (!validateIndianPinCode(pin_code)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit Indian PIN code.' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      const cookieStore = await cookies()
      let list = getDevAddresses(cookieStore)
      if (is_default) {
        list = list.map((a) => ({ ...a, is_default: false }))
      }
      const newAddr = {
        id: `addr-${Date.now()}`,
        user_id: user.id,
        full_name,
        phone,
        address_line1,
        address_line2: address_line2 || null,
        city,
        state,
        pin_code,
        country: 'IN',
        is_default: Boolean(is_default),
        created_at: new Date().toISOString(),
      }
      list.unshift(newAddr)
      const res = NextResponse.json({ success: true, address: newAddr })
      res.cookies.set('bb_dev_addresses', JSON.stringify(list), {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    }

    const supabase = await createServerClient()
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        full_name,
        phone,
        address_line1,
        address_line2: address_line2 || null,
        city,
        state,
        pin_code,
        country: 'IN',
        is_default: Boolean(is_default),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, address: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Address id is required' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      const cookieStore = await cookies()
      let list = getDevAddresses(cookieStore)
      list = list.filter((a) => a.id !== id)
      const res = NextResponse.json({ success: true, message: 'Address removed' })
      res.cookies.set('bb_dev_addresses', JSON.stringify(list), {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
