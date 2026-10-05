import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'

export const PRODUCT_IMAGES_BUCKET = 'product-images'

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
])

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export function sanitizeFilename(originalName: string): { base: string; ext: string } {
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

export function generateStoragePath(originalName: string): string {
  const { base, ext } = sanitizeFilename(originalName)
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `products/prod-${Date.now()}-${randomSuffix}-${base}.${ext}`
}

export function extractStoragePath(url: string): string | null {
  if (!url) return null
  const match = url.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/)
  if (match && match[1]) {
    return decodeURIComponent(match[1])
  }
  return null
}

export function validateImageFile(contentType: string, size: number, name?: string): { valid: boolean; error?: string } {
  const normalizedType = contentType?.toLowerCase()
  if (!ALLOWED_MIME_TYPES.has(normalizedType)) {
    return {
      valid: false,
      error: `Unsupported image format "${contentType}". Allowed formats: JPEG, PNG, WEBP, AVIF, GIF.`,
    }
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    const filenameLabel = name ? ` "${name}"` : ''
    return {
      valid: false,
      error: `File${filenameLabel} exceeds the 10MB limit. Please upload a smaller image.`,
    }
  }

  return { valid: true }
}

export async function ensureProductImageBucket(supabase: any): Promise<void> {
  try {
    const { data: bucket, error: getErr } = await supabase.storage.getBucket(PRODUCT_IMAGES_BUCKET)
    if (!bucket || getErr) {
      await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
      })
    }
  } catch (err) {
    console.warn('[Storage] Could not verify/create bucket:', err)
  }
}

export async function createSignedProductUpload(params: {
  filename: string
  contentType: string
  size: number
}): Promise<{
  path: string
  signedUrl: string
  token: string
  publicUrl: string
}> {
  const validation = validateImageFile(params.contentType, params.size, params.filename)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const storagePath = generateStoragePath(params.filename)

  if (!isSupabaseConfigured()) {
    // Development / test fallback without writing to disk
    const mockUrl = `https://placeholder.supabase.co/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${storagePath}`
    return {
      path: storagePath,
      signedUrl: mockUrl,
      token: 'mock-token',
      publicUrl: mockUrl,
    }
  }

  const supabase = await createServiceClient()
  await ensureProductImageBucket(supabase)

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true })

  if (error || !data) {
    throw new Error(error?.message || 'Failed to generate signed upload URL from Supabase Storage')
  }

  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath)

  return {
    path: storagePath,
    signedUrl: data.signedUrl || (data as any).url,
    token: data.token,
    publicUrl: publicUrlData.publicUrl,
  }
}

export async function uploadProductImageBuffer(params: {
  buffer: Buffer
  filename: string
  contentType: string
}): Promise<{
  path: string
  publicUrl: string
}> {
  const validation = validateImageFile(params.contentType, params.buffer.length, params.filename)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const storagePath = generateStoragePath(params.filename)

  if (!isSupabaseConfigured()) {
    // Development / test fallback without writing to disk
    const mockUrl = `https://placeholder.supabase.co/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${storagePath}`
    return {
      path: storagePath,
      publicUrl: mockUrl,
    }
  }

  const supabase = await createServiceClient()
  await ensureProductImageBucket(supabase)

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, params.buffer, {
      contentType: params.contentType,
      upsert: true,
    })

  if (error || !data) {
    throw new Error(error?.message || 'Failed to upload image to Supabase Storage')
  }

  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(data.path || storagePath)

  return {
    path: data.path || storagePath,
    publicUrl: publicUrlData.publicUrl,
  }
}
