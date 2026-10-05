import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as handleUpload } from '@/app/api/admin/upload/route'
import * as authModule from '@/lib/auth'
import * as supabaseModule from '@/lib/supabase/server'
import { getSafeImageUrl } from '@/lib/utils'
import fs from 'fs'
import path from 'path'

describe('Admin Product Image Upload Suite', () => {
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
    expect(json.error).toContain('Unsupported file type')
  })

  it('rejects files exceeding 10MB limit', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)

    // Create a mock file with size > 10MB
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
    expect(json.error).toContain('exceeds the 10MB size limit')
  })

  it('successfully uploads single image and saves to public/images/products directory', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(false)

    const fileContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG signature
    const fakeFile = new File([fileContent], 'acid-wash-tee.png', { type: 'image/png' })

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
    expect(json.urls).toHaveLength(1)
    expect(json.url).toMatch(/^\/images\/products\/prod-.*-acid-wash-tee\.png$/)

    // Verify file exists on disk and clean it up
    const relativeSavedPath = json.url.replace('/images/products/', '')
    const fullDiskPath = path.join(process.cwd(), 'public', 'images', 'products', relativeSavedPath)
    expect(fs.existsSync(fullDiskPath)).toBe(true)
    fs.unlinkSync(fullDiskPath) // Clean up test artifact

    // Verify safe image URL utility accepts the uploaded URL
    expect(getSafeImageUrl(json.url)).toBe(json.url)
  })

  it('successfully uploads multiple images at once via files field', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(false)

    const fileContent1 = new Uint8Array([255, 216, 255]) // JPG signature
    const fileContent2 = new Uint8Array([82, 73, 70, 70]) // WEBP signature
    const file1 = new File([fileContent1], 'front-view.jpg', { type: 'image/jpeg' })
    const file2 = new File([fileContent2], 'back-view.webp', { type: 'image/webp' })

    const formData = new FormData()
    formData.append('files', file1)
    formData.append('files', file2)

    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await handleUpload(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.urls).toHaveLength(2)

    // Clean up created test files
    for (const url of json.urls) {
      const filename = url.replace('/images/products/', '')
      const diskPath = path.join(process.cwd(), 'public', 'images', 'products', filename)
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath)
      }
    }
  })

  it('uses Supabase Storage when configured and returns publicUrl', async () => {
    vi.spyOn(authModule, 'getCurrentUser').mockResolvedValue({ id: 'admin-id', email: 'admin@bubbleboom.in' } as any)
    vi.spyOn(authModule, 'isAdmin').mockResolvedValue(true)
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true)

    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'prod-mock-uuid-test.webp' },
      error: null,
    })
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://test-project.supabase.co/storage/v1/object/public/product-images/prod-mock-uuid-test.webp' },
    })

    vi.spyOn(supabaseModule, 'createServiceClient').mockResolvedValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        }),
      },
    } as any)

    const fakeFile = new File(['sample bytes'], 'hoodie.webp', { type: 'image/webp' })
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
      'https://test-project.supabase.co/storage/v1/object/public/product-images/prod-mock-uuid-test.webp'
    )
  })
})
