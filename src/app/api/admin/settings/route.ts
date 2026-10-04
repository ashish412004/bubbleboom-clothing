import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data: settings } = await supabase.from('store_settings').select('*')
    return NextResponse.json({ success: true, settings: settings || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { key, value } = await req.json()

    if (!key || !value) {
      return NextResponse.json({ error: 'Setting key and value are required' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('store_settings')
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) throw error

    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: 'UPDATE_SETTINGS',
      entity: 'store_settings',
      entity_id: key,
      metadata: { value },
    })

    return NextResponse.json({ success: true, setting: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
