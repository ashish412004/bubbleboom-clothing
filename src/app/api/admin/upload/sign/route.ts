import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createSignedProductUpload } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()

    // Support single file or multiple files
    if (Array.isArray(body?.files)) {
      const results = []
      for (const item of body.files) {
        if (!item.filename || !item.contentType) {
          return NextResponse.json(
            { error: 'Filename and contentType are required for all files.' },
            { status: 400 }
          )
        }
        const signed = await createSignedProductUpload({
          filename: item.filename,
          contentType: item.contentType,
          size: item.size || 0,
        })
        results.push(signed)
      }

      return NextResponse.json({
        success: true,
        files: results,
      })
    }

    const { filename, contentType, size } = body || {}
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Filename and contentType are required.' },
        { status: 400 }
      )
    }

    const signed = await createSignedProductUpload({
      filename,
      contentType,
      size: Number(size) || 0,
    })

    return NextResponse.json({
      success: true,
      ...signed,
    })
  } catch (error: any) {
    console.error('[Admin Signed Upload Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate signed upload URL' },
      { status: 400 }
    )
  }
}
