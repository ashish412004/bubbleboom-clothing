import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
}))

import { metadata } from '@/app/layout'
import robots from '@/app/robots'

describe('Bubble Boom – Official Logo Favicon & Branding Suite', () => {
  const root = process.cwd()

  describe('1. Favicon File Assets Existence & Dimensions', () => {
    it('generates 48x48 PNG for Google Search primary standard', async () => {
      const file = path.join(root, 'public/favicon-48x48.png')
      expect(fs.existsSync(file)).toBe(true)
      const meta = await sharp(file).metadata()
      expect(meta.width).toBe(48)
      expect(meta.height).toBe(48)
      expect(meta.format).toBe('png')
    })

    it('generates 96x96 PNG for high-DPI desktop browser tabs', async () => {
      const file = path.join(root, 'public/favicon-96x96.png')
      expect(fs.existsSync(file)).toBe(true)
      const meta = await sharp(file).metadata()
      expect(meta.width).toBe(96)
      expect(meta.height).toBe(96)
      expect(meta.format).toBe('png')
    })

    it('generates 192x192 PNG for Android / PWA home screen icons', async () => {
      const file = path.join(root, 'public/icon-192.png')
      expect(fs.existsSync(file)).toBe(true)
      const meta = await sharp(file).metadata()
      expect(meta.width).toBe(192)
      expect(meta.height).toBe(192)
      expect(meta.format).toBe('png')
    })

    it('generates 512x512 PNG for high-resolution splash and search cards', async () => {
      const file = path.join(root, 'public/icon-512.png')
      expect(fs.existsSync(file)).toBe(true)
      const meta = await sharp(file).metadata()
      expect(meta.width).toBe(512)
      expect(meta.height).toBe(512)
      expect(meta.format).toBe('png')
    })

    it('generates 180x180 PNG Apple Touch Icon for iOS Safari', async () => {
      const file = path.join(root, 'public/apple-touch-icon.png')
      expect(fs.existsSync(file)).toBe(true)
      const meta = await sharp(file).metadata()
      expect(meta.width).toBe(180)
      expect(meta.height).toBe(180)
      expect(meta.format).toBe('png')

      const precomp = path.join(root, 'public/apple-touch-icon-precomposed.png')
      expect(fs.existsSync(precomp)).toBe(true)
    })

    it('generates valid multi-resolution favicon.ico in public and src/app', () => {
      for (const loc of ['public/favicon.ico', 'src/app/favicon.ico']) {
        const file = path.join(root, loc)
        expect(fs.existsSync(file)).toBe(true)
        const buf = fs.readFileSync(file)
        expect(buf.length).toBeGreaterThan(1000)
        // Check ICO magic header bytes (00 00 01 00)
        expect(buf[0]).toBe(0)
        expect(buf[1]).toBe(0)
        expect(buf[2]).toBe(1)
        expect(buf[3]).toBe(0)
      }
    })

    it('provides Next.js App Router root icon and apple-icon files', async () => {
      const appIcon = path.join(root, 'src/app/icon.png')
      expect(fs.existsSync(appIcon)).toBe(true)
      const appApple = path.join(root, 'src/app/apple-icon.png')
      expect(fs.existsSync(appApple)).toBe(true)
    })

    it('provides public/images/brand/logo.png for schema.org Organization', () => {
      const file = path.join(root, 'public/images/brand/logo.png')
      expect(fs.existsSync(file)).toBe(true)
    })
  })

  describe('2. Next.js App Router Metadata & Manifest Configuration', () => {
    it('specifies complete multi-size icon set in RootLayout metadata', () => {
      const icons = metadata.icons as any
      expect(icons).toBeDefined()
      expect(icons.shortcut).toBe('/favicon.ico')
      expect(Array.isArray(icons.icon)).toBe(true)

      const iconUrls = icons.icon.map((i: any) => i.url)
      expect(iconUrls).toContain('/favicon.ico')
      expect(iconUrls).toContain('/favicon-48x48.png')
      expect(iconUrls).toContain('/favicon-96x96.png')
      expect(iconUrls).toContain('/icon-192.png')
      expect(iconUrls).toContain('/icon-512.png')

      expect(Array.isArray(icons.apple)).toBe(true)
      const appleUrls = icons.apple.map((a: any) => a.url)
      expect(appleUrls).toContain('/apple-touch-icon.png')
    })

    it('defines web app manifest link pointing to /site.webmanifest', () => {
      expect(metadata.manifest).toBe('/site.webmanifest')

      const manifestContent = JSON.parse(fs.readFileSync(path.join(root, 'public/site.webmanifest'), 'utf-8'))
      expect(manifestContent.name).toBe('Bubble Boom')
      expect(manifestContent.short_name).toBe('Bubble Boom')
      expect(manifestContent.theme_color).toBe('#000000')
      expect(manifestContent.background_color).toBe('#000000')
      expect(manifestContent.icons.length).toBeGreaterThanOrEqual(4)
    })

    it('ensures robots.txt allows public crawling of favicons and site assets', () => {
      const robotConfig = robots()
      const rules = Array.isArray(robotConfig.rules) ? robotConfig.rules[0] : robotConfig.rules
      expect(rules.allow).toBe('/')
      // Root assets like /favicon.ico and /favicon-48x48.png are under / and allowed
      expect(rules.disallow).not.toContain('/favicon.ico')
      expect(rules.disallow).not.toContain('/favicon-48x48.png')
      expect(rules.disallow).not.toContain('/icon-192.png')
    })
  })

  describe('3. Removal of Default Next.js Template SVGs', () => {
    it('verifies default boilerplate SVGs are removed from public root', () => {
      const legacy = ['file.svg', 'globe.svg', 'next.svg', 'vercel.svg', 'window.svg']
      for (const f of legacy) {
        expect(fs.existsSync(path.join(root, 'public', f))).toBe(false)
      }
    })
  })
})
