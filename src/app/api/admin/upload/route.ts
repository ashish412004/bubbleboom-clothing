import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { uploadProductImageBuffer, validateImageFile } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const formData = await req.formData()
    const rawFiles: File[] = []

    // Support both 'files' (multiple) and 'file' (single)
    const fileEntries = formData.getAll('files')
    if (fileEntries.length > 0) {
      for (const entry of fileEntries) {
        if (entry instanceof File && entry.size > 0) {
          rawFiles.push(entry)
        }
      }
    }

    const singleEntry = formData.get('file')
    if (singleEntry instanceof File && singleEntry.size > 0 && !rawFiles.includes(singleEntry)) {
      rawFiles.push(singleEntry)
    }

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { error: 'No image files provided for upload.' },
        { status: 400 }
      )
    }

    // Validate files upfront
    for (const file of rawFiles) {
      const validation = validateImageFile(file.type, file.size, file.name)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }

    const uploadedUrls: string[] = []
    const uploadedDetails: Array<{ url: string; path: string; name: string; size: number }> = []

    // Upload files directly to Supabase Storage (never to disk)
    for (const file of rawFiles) {
      const arrayBuf = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)

      const result = await uploadProductImageBuffer({
        buffer,
        filename: file.name,
        contentType: file.type,
      })

      uploadedUrls.push(result.publicUrl)
      uploadedDetails.push({
        url: result.publicUrl,
        path: result.path,
        name: file.name,
        size: file.size,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedUrls.length} image(s).`,
      urls: uploadedUrls,
      url: uploadedUrls[0],
      files: uploadedDetails,
    })
  } catch (error: any) {
    console.error('[Admin Upload Error]:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during image upload.' },
      { status: 500 }
    )
  }
}
