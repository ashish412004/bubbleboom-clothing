import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Security Fixes & Domain Audit Verification', () => {
  describe('1. Legacy Domain References Removal', () => {
    it('terms/page.tsx references bubbleboomstore.com and contains NO bubbleboom.in', () => {
      const content = fs.readFileSync(path.join(process.cwd(), 'src/app/terms/page.tsx'), 'utf-8')
      expect(content).toContain('bubbleboomstore.com')
      expect(content).not.toContain('bubbleboom.in')
    })

    it('returns.ts uses bubbleboomstore.com/track-order and contains NO track.bubbleboom.in', () => {
      const content = fs.readFileSync(path.join(process.cwd(), 'src/lib/returns.ts'), 'utf-8')
      expect(content).toContain('https://bubbleboomstore.com/track-order?awb=')
      expect(content).not.toContain('track.bubbleboom.in')
    })

    it('mailer.ts uses bubbleboomstore2026@gmail.com and contains NO orders@bubbleboom.in', () => {
      const content = fs.readFileSync(path.join(process.cwd(), 'src/lib/emails/mailer.ts'), 'utf-8')
      expect(content).toContain('bubbleboomstore2026@gmail.com')
      expect(content).not.toContain('orders@bubbleboom.in')
    })

    it('templates.ts defaults SITE_URL to https://bubbleboomstore.com', () => {
      const content = fs.readFileSync(path.join(process.cwd(), 'src/lib/emails/templates.ts'), 'utf-8')
      expect(content).toContain('https://bubbleboomstore.com')
    })

    it('resend.ts defaults siteUrl to https://bubbleboomstore.com', () => {
      const content = fs.readFileSync(path.join(process.cwd(), 'src/lib/emails/resend.ts'), 'utf-8')
      expect(content).toContain('https://bubbleboomstore.com')
    })

    it('entire src directory contains zero occurrences of bubbleboom.in', () => {
      function scanDir(dir: string, results: string[] = []) {
        const files = fs.readdirSync(dir)
        for (const f of files) {
          const fullPath = path.join(dir, f)
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            scanDir(fullPath, results)
          } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.json')) {
            const content = fs.readFileSync(fullPath, 'utf-8')
            if (content.includes('bubbleboom.in')) {
              results.push(fullPath)
            }
          }
        }
        return results
      }

      const matches = scanDir(path.join(process.cwd(), 'src'))
      expect(matches).toEqual([])
    })
  })

  describe('2. SQL Migration 024 Structure & Coverage', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/024_fix_rls_security_lockdown.sql')
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')

    it('defines security definer is_admin helper to prevent RLS recursion', () => {
      expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.is_admin')
      expect(sqlContent).toContain('SECURITY DEFINER')
      expect(sqlContent).toContain('role = \'admin\'')
    })

    it('enables RLS on all 12 sensitive tables', () => {
      const expectedTables = [
        'profiles',
        'addresses',
        'orders',
        'order_items',
        'payments',
        'carts',
        'cart_items',
        'wishlists',
        'wishlist_items',
        'admin_audit_logs',
        'newsletter_subscribers',
        'user_roles',
      ]

      for (const table of expectedTables) {
        expect(sqlContent).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`)
      }
    })

    it('protects customer data while allowing authenticated owner and admin access', () => {
      expect(sqlContent).toContain('auth.uid() = id OR public.is_admin()')
      expect(sqlContent).toContain('auth.uid() = user_id OR public.is_admin()')
      expect(sqlContent).toContain('orders.user_id = auth.uid()')
    })

    it('allows public newsletter insert while restricting select to admin', () => {
      expect(sqlContent).toContain('CREATE POLICY "newsletter_insert_public"')
      expect(sqlContent).toContain('CREATE POLICY "newsletter_select_admin_only"')
    })
  })
})
