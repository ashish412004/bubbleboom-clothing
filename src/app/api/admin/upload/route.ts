import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB per image

function sanitizeFilename(originalName: string): { base: string; ext: string } {
  const parts = originalName.split('.')
  const ext = (parts.length > 1 ? parts.pop() : 'webp')?.toLowerCase() || 'webp'
  const rawBase = parts.join('.') || 'product'
  const base = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
  return { base, ext }
}

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

    // Validate files first
    for (const file of rawFiles) {
      if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
        return NextResponse.json(
          {
            error: `Unsupported file type "${file.type}". Allowed formats: JPEG, PNG, WEBP, AVIF, GIF.`,
          },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds the 10MB size limit. Please upload a smaller image.`,
          },
          { status: 400 }
        )
      }
    }

    const uploadedUrls: string[] = []
    const uploadedDetails: Array<{ url: string; name: string; size: number }> = []

    // Upload files
    for (const file of rawFiles) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const { base, ext } = sanitizeFilename(file.name)
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const filename = `prod-${Date.now()}-${randomSuffix}-${base}.${ext}`

      let fileSavedUrl: string | null = null

      // Attempt Supabase storage first if configured
      if (isSupabaseConfigured()) {
        try {
          const supabase = await createServiceClient()
          const bucket = 'product-images'

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(filename, buffer, {
              contentType: file.type,
              upsert: true,
            })

          if (!uploadErr && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(uploadData.path)

            if (publicUrlData?.publicUrl) {
              fileSavedUrl = publicUrlData.publicUrl
            }
          } else if (uploadErr) {
            console.warn(
              '[Admin Upload] Supabase Storage upload error, falling back to local file storage:',
              uploadErr.message
            )
          }
        } catch (supabaseErr: any) {
          console.warn(
            '[Admin Upload] Supabase Storage exception, falling back to local file storage:',
            supabaseErr?.message
          )
        }
      }

      // Fallback: Save to public/images/products directory
      if (!fileSavedUrl) {
        const publicProductsDir = path.join(process.cwd(), 'public', 'images', 'products')
        if (!fs.existsSync(publicProductsDir)) {
          fs.mkdirSync(publicProductsDir, { recursive: true })
        }
        const diskPath = path.join(publicProductsDir, filename)
        await fs.promises.writeFile(diskPath, buffer)
        fileSavedUrl = `/images/products/${filename}`
      }

      uploadedUrls.push(fileSavedUrl)
      uploadedDetails.push({
        url: fileSavedUrl,
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
