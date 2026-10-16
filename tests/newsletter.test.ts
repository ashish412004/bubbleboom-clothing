import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { POST as newsletterPost } from '@/app/api/newsletter/route'
import { POST as confirmPost } from '@/app/api/newsletter/confirm/route'
import { GET as verifyGet } from '@/app/api/newsletter/confirm/verify/route'
import { POST as resendPost } from '@/app/api/newsletter/resend/route'
import { GET as statusGet } from '@/app/api/newsletter/status/route'
import { POST as unsubPost } from '@/app/api/newsletter/unsubscribe/route'
import { GET as adminSubsGet, POST as adminSubsPost } from '@/app/api/admin/subscribers/route'
import * as resendModule from '@/lib/emails/resend'

describe('Newsletter & Subscription System Retirement Suite', () => {
  it('returns 410 Gone on customer newsletter subscription API (/api/newsletter)', async () => {
    const res = await newsletterPost()
    expect(res.status).toBe(410)
    const json = await res.json()
    expect(json.error).toContain('retired')
  })

  it('returns 410 Gone on confirmation endpoint (/api/newsletter/confirm)', async () => {
    const res = await confirmPost()
    expect(res.status).toBe(410)
    const json = await res.json()
    expect(json.error).toContain('retired')
  })

  it('returns 410 Gone on confirmation verification endpoint (/api/newsletter/confirm/verify)', async () => {
    const res = await verifyGet()
    expect(res.status).toBe(410)
    const json = await res.json()
    expect(json.error).toContain('retired')
  })

  it('returns 410 Gone on resend confirmation endpoint (/api/newsletter/resend)', async () => {
    const res = await resendPost()
    expect(res.status).toBe(410)
    const json = await res.json()
    expect(json.error).toContain('retired')
  })

  it('returns 410 Gone on subscriber status endpoint (/api/newsletter/status)', async () => {
    const res = await statusGet()
    expect(res.status).toBe(410)
    const json = await res.json()
    expect(json.error).toContain('retired')
  })

  it('returns 410 Gone on unsubscribe endpoint (/api/newsletter/unsubscribe)', async () => {
    const res = await unsubPost()
    expect(res.status).toBe(410)
    const json = await res.json()
    expect(json.error).toContain('retired')
  })

  it('returns 410 Gone on admin subscribers endpoints (/api/admin/subscribers)', async () => {
    const getRes = await adminSubsGet()
    expect(getRes.status).toBe(410)
    const getJson = await getRes.json()
    expect(getJson.error).toContain('retired')

    const postRes = await adminSubsPost()
    expect(postRes.status).toBe(410)
    const postJson = await postRes.json()
    expect(postJson.error).toContain('retired')
  })

  it('verifies Newsletter Squad is removed from Admin navigation (sidebar & shell)', () => {
    const sidebarPath = path.join(process.cwd(), 'src/components/admin/admin-sidebar.tsx')
    const shellPath = path.join(process.cwd(), 'src/components/admin/admin-shell.tsx')
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8')
    const shellContent = fs.readFileSync(shellPath, 'utf-8')

    expect(sidebarContent).not.toContain('/admin/subscribers')
    expect(sidebarContent).not.toContain('Newsletter Squad')
    expect(shellContent).not.toContain('/admin/subscribers')
    expect(shellContent).not.toContain('Newsletter Squad')
  })

  it('verifies /newsletter/confirm and /newsletter/unsubscribe redirect to home', () => {
    const confirmPath = path.join(process.cwd(), 'src/app/newsletter/confirm/page.tsx')
    const unsubPath = path.join(process.cwd(), 'src/app/newsletter/unsubscribe/page.tsx')
    const confirmContent = fs.readFileSync(confirmPath, 'utf-8')
    const unsubContent = fs.readFileSync(unsubPath, 'utf-8')

    expect(confirmContent).toContain("redirect('/')")
    expect(unsubContent).toContain("redirect('/')")
  })

  it('preserves all transactional email functions while retiring marketing/newsletter emails', () => {
    // Transactional emails MUST exist
    expect(typeof resendModule.sendOrderConfirmationEmail).toBe('function')
    expect(typeof resendModule.sendOrderShippedEmail).toBe('function')
    expect(typeof resendModule.sendOrderDeliveredEmail).toBe('function')
    expect(typeof resendModule.sendReturnRequestEmail).toBe('function')
    expect(typeof resendModule.sendReturnApprovedEmail).toBe('function')
    expect(typeof resendModule.sendWelcomeEmail).toBe('function')
    expect(typeof resendModule.sendReturnLifecycleEmail).toBe('function')

    // Newsletter-specific functions MUST NOT exist
    expect((resendModule as any).sendNewsletterConfirmationEmail).toBeUndefined()
    expect((resendModule as any).sendNewsletterWelcomeEmail).toBeUndefined()
    expect((resendModule as any).sendNewsletterUnsubscribeEmail).toBeUndefined()
  })
})
