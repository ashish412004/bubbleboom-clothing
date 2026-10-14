import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = await createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to upload images' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, or WebP images are supported.' },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size exceeds maximum limit of 5MB.' },
        { status: 400 }
      )
    }

    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const supabase = await createServiceClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `returns/${user.id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`

    // Upload to return-images bucket (with fallback to product-images)
    let uploadRes = await supabase.storage.from('return-images').upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

    let bucketUsed = 'return-images'
    if (uploadRes.error) {
      // Fallback to product-images bucket
      uploadRes = await supabase.storage.from('product-images').upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })
      bucketUsed = 'product-images'
    }

    if (uploadRes.error) {
      return NextResponse.json({ error: uploadRes.error.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from(bucketUsed).getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
