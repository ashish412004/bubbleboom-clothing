import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as handleUpload } from '@/app/api/admin/upload/route'
import { POST as handleSign } from '@/app/api/admin/upload/sign/route'
import { POST as handleCreateProduct, PUT as handleUpdateProduct } from '@/app/api/admin/products/route'
import * as authModule from '@/lib/auth'
import * as supabaseModule from '@/lib/supabase/server'
import { extractStoragePath } from '@/lib/storage'
import { getSafeImageUrl } from '@/lib/utils'

describe('Admin Product Image Upload Suite (Supabase Storage)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects unauthenticated requests with 403', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue(null as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(false)

    const formData = new FormData()
    const fakeFile = new File(['fake image data'], 'sample.png', { type: 'image/png' })
    formData.append('file', fakeFile)

    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await handleUpload(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('Unauthorized')
  })

  it('rejects unauthorized non-admin user with 403', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'user-regular', email: 'regular@user.com' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(false)

    const formData = new FormData()
    const fakeFile = new File(['fake image data'], 'sample.png', { type: 'image/png' })
    formData.append('file', fakeFile)

    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await handleUpload(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('Unauthorized')
  })

  it('rejects upload when no files are provided in form data', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)

    const formData = new FormData()
    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await handleUpload(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('No image files provided')
  })

  it('rejects invalid/unsupported file types (e.g. text/plain or pdf)', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)

    const formData = new FormData()
    const fakeFile = new File(['not an image content'], 'document.txt', { type: 'text/plain' })
    formData.append('file', fakeFile)

    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await handleUpload(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Unsupported image format')
  })

  it('rejects files exceeding 10MB limit', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)

    const largeContent = new Uint8Array(10 * 1024 * 1024 + 1024)
    const fakeLargeFile = new File([largeContent], 'heavy.png', { type: 'image/png' })

    const formData = new FormData()
    formData.append('file', fakeLargeFile)

    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await handleUpload(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('exceeds the 10MB limit')
  })

  it('signs upload URLs for direct browser-to-Supabase Storage uploads', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true)

    const mockCreateSignedUploadUrl = vi.fn().mockResolvedValue({
      data: {
        signedUrl: 'https://test-project.supabase.co/storage/v1/object/upload/sign/product-images/products/test.webp?token=xyz',
        token: 'xyz',
        path: 'products/test.webp',
      },
      error: null,
    })

    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl: 'https://test-project.supabase.co/storage/v1/object/public/product-images/products/test.webp',
      },
    })

    vi.spyOn(supabaseModule, 'createServiceClient').mockResolvedValue({
      storage: {
        getBucket: vi.fn().mockResolvedValue({ data: { name: 'product-images' }, error: null }),
        createBucket: vi.fn(),
        from: vi.fn().mockReturnValue({
          createSignedUploadUrl: mockCreateSignedUploadUrl,
          getPublicUrl: mockGetPublicUrl,
        }),
      },
    } as any)

    const req = new NextRequest('http://localhost:3000/api/admin/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'oversized-tee.webp',
        contentType: 'image/webp',
        size: 500000,
      }),
    })

    const res = await handleSign(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.token).toBe('xyz')
    expect(json.path).toMatch(/^products\/prod-.*-oversized-tee\.webp$/)
    expect(json.publicUrl).toContain('product-images')
  })

  it('rejects unauthorized signed upload requests with 403', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue(null as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(false)

    const req = new NextRequest('http://localhost:3000/api/admin/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'hacker.png',
        contentType: 'image/png',
        size: 1000,
      }),
    })

    const res = await handleSign(req)
    expect(res.status).toBe(403)
  })

  it('uploads images directly to Supabase Storage without writing to filesystem', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true)

    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'products/prod-12345-front.jpg' },
      error: null,
    })
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl: 'https://test-project.supabase.co/storage/v1/object/public/product-images/products/prod-12345-front.jpg',
      },
    })

    vi.spyOn(supabaseModule, 'createServiceClient').mockResolvedValue({
      storage: {
        getBucket: vi.fn().mockResolvedValue({ data: { name: 'product-images' }, error: null }),
        createBucket: vi.fn(),
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        }),
      },
    } as any)

    const fileContent = new Uint8Array([255, 216, 255, 224])
    const fakeFile = new File([fileContent], 'jacket.jpg', { type: 'image/jpeg' })

    const formData = new FormData()
    formData.append('file', fakeFile)

    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await handleUpload(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.url).toBe(
      'https://test-project.supabase.co/storage/v1/object/public/product-images/products/prod-12345-front.jpg'
    )
    expect(mockUpload).toHaveBeenCalled()
  })

  it('extracts storage path from Supabase CDN URLs correctly', () => {
    const supabaseUrl =
      'https://my-ref.supabase.co/storage/v1/object/public/product-images/products/prod-1791223588378-image.webp'
    const path = extractStoragePath(supabaseUrl)
    expect(path).toBe('products/prod-1791223588378-image.webp')

    const externalUrl = 'https://images.unsplash.com/photo-1521572267360?w=800'
    expect(extractStoragePath(externalUrl)).toBeNull()
  })

  it('saves storage_path alongside permanent image_url during product creation', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true)

    const mockInsertImages = vi.fn().mockResolvedValue({ error: null })
    const mockInsertAudit = vi.fn().mockResolvedValue({ error: null })

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'products') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'prod-uuid-1', name: 'Test Boxy Tee', slug: 'test-boxy-tee' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'product_variants') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'product_images') {
          return {
            insert: mockInsertImages,
          }
        }
        if (table === 'admin_audit_logs') {
          return {
            insert: mockInsertAudit,
          }
        }
        return {}
      }),
    }

    vi.spyOn(supabaseModule, 'createServiceClient').mockResolvedValue(mockSupabase as any)

    const req = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: {
          name: 'Test Boxy Tee',
          slug: 'test-boxy-tee',
          selling_price: 1299,
        },
        variants: [{ color: 'Black', size: 'M', stock: 15 }],
        images: [
          'https://my-ref.supabase.co/storage/v1/object/public/product-images/products/prod-123-acid.webp',
        ],
      }),
    })

    const res = await handleCreateProduct(req)
    expect(res.status).toBe(200)
    expect(mockInsertImages).toHaveBeenCalledWith([
      expect.objectContaining({
        product_id: 'prod-uuid-1',
        image_url:
          'https://my-ref.supabase.co/storage/v1/object/public/product-images/products/prod-123-acid.webp',
        storage_path: 'products/prod-123-acid.webp',
        sort_order: 0,
      }),
    ])
  })

  it('retains old images on replacement if database insert fails', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true)

    const mockDeleteImages = vi.fn().mockResolvedValue({ error: null })
    const mockInsertImages = vi.fn().mockResolvedValue({
      error: { message: 'Database connection dropped' },
    })

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'products') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'prod-uuid-1', name: 'Updated Tee' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'product_variants') {
          return {
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'product_images') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'old-img-1' }],
                error: null,
              }),
            }),
            insert: mockInsertImages,
            delete: vi.fn().mockReturnValue({ in: mockDeleteImages }),
          }
        }
        if (table === 'admin_audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      }),
    }

    vi.spyOn(supabaseModule, 'createServiceClient').mockResolvedValue(mockSupabase as any)

    const req = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: {
          id: 'prod-uuid-1',
          name: 'Updated Tee',
          slug: 'updated-tee',
          selling_price: 1499,
        },
        images: ['https://my-ref.supabase.co/storage/v1/object/public/product-images/products/new.webp'],
      }),
    })

    const res = await handleUpdateProduct(req)
    expect(res.status).toBe(200)
    // Because mockInsertImages failed, delete must NEVER have been called on old images!
    expect(mockDeleteImages).not.toHaveBeenCalled()
  })
})
