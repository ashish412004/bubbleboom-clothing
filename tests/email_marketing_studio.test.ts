import { describe, it, expect } from 'vitest'
import {
  generateCampaignHtml,
  CAMPAIGN_PRESET_TEMPLATES,
  OFFICIAL_WEBSITE_URL,
  DEFAULT_SUPPORT_EMAIL,
} from '@/lib/email-marketing/templates'
import { CampaignContent } from '@/lib/email-marketing/types'
import { POST as unsubscribePost } from '@/app/api/marketing/unsubscribe/route'
import { NextRequest } from 'next/server'

describe('Bubble Boom – Email Marketing Studio & Updates Suite', () => {
  // =========================================================================
  // 1. OPTIONAL CTA BUTTON REQUIREMENT
  // =========================================================================
  describe('1. Optional CTA Button Requirements', () => {
    it('defaults show_cta to false across all 5 preset templates', () => {
      const templateKeys = Object.keys(CAMPAIGN_PRESET_TEMPLATES) as Array<
        keyof typeof CAMPAIGN_PRESET_TEMPLATES
      >
      expect(templateKeys).toHaveLength(5)

      for (const key of templateKeys) {
        const preset = CAMPAIGN_PRESET_TEMPLATES[key]
        expect(preset.defaultContent.show_cta).toBe(false)
      }
    })

    it('completely removes CTA button when show_cta is false (no empty placeholder or empty button space)', () => {
      const content: CampaignContent = {
        heading: 'SPRING DROP 001',
        subheading: 'COMING SOON',
        body_text: 'Get ready for our limited heavyweight collection.',
        show_cta: false,
        cta_text: 'SHOP NOW',
        cta_url: 'https://bubbleboomstore.com/shop',
      }

      const html = generateCampaignHtml(content)

      // Must not render button text
      expect(html).not.toContain('SHOP NOW')
      // Must not render button anchor tag with cta_url
      expect(html).not.toContain('https://bubbleboomstore.com/shop')
      // Must not contain empty button wrapper or placeholder
      expect(html).not.toContain('mso-text-raise')
    })

    it('renders styled CTA button when show_cta is explicitly true', () => {
      const content: CampaignContent = {
        heading: 'SPRING DROP 001',
        body_text: 'Available now on the official store.',
        show_cta: true,
        cta_text: 'EXPLORE COLLECTION',
        cta_url: 'https://bubbleboomstore.com/products',
        cta_style: 'black',
      }

      const html = generateCampaignHtml(content)

      expect(html).toContain('EXPLORE COLLECTION')
      expect(html).toContain('https://bubbleboomstore.com/products')
      expect(html).toContain('background-color: #000000')
    })

    it('supports white solid button styling when show_cta is true', () => {
      const content: CampaignContent = {
        heading: 'VIP EXCLUSIVE',
        show_cta: true,
        cta_text: 'UNLOCK ACCESS',
        cta_url: 'https://bubbleboomstore.com/vip',
        cta_style: 'white',
      }

      const html = generateCampaignHtml(content)

      expect(html).toContain('UNLOCK ACCESS')
      expect(html).toContain('background-color: #ffffff')
    })
  })

  // =========================================================================
  // 2. WEBSITE LINK IS ALWAYS REQUIRED
  // =========================================================================
  describe('2. Mandatory Official Website Link Requirements', () => {
    it('always includes official website link in footer when show_cta is false', () => {
      const content: CampaignContent = {
        heading: 'ANNOUNCEMENT ONLY',
        body_text: 'Lookbook update from Bubble Boom.',
        show_cta: false,
      }

      const html = generateCampaignHtml(content)

      // Official website link is present as clickable hyperlink
      expect(html).toContain(OFFICIAL_WEBSITE_URL)
      expect(html).toContain(`href="${OFFICIAL_WEBSITE_URL}"`)
      expect(html).toContain('BUBBLEBOOMSTORE.COM &rarr;')
    })

    it('always includes official website link in footer when show_cta is true', () => {
      const content: CampaignContent = {
        heading: 'SPECIAL RELEASE',
        body_text: 'Check out the new drops.',
        show_cta: true,
        cta_text: 'VIEW PRODUCTS',
        cta_url: 'https://bubbleboomstore.com/shop',
      }

      const html = generateCampaignHtml(content)

      expect(html).toContain(OFFICIAL_WEBSITE_URL)
      expect(html).toContain(`href="${OFFICIAL_WEBSITE_URL}"`)
      expect(html).toContain('BUBBLEBOOMSTORE.COM &rarr;')
    })

    it('strictly points to official domain bubbleboomstore.com and not any legacy domain', () => {
      const content: CampaignContent = {
        body_text: 'Sample notification',
        show_cta: false,
      }

      const html = generateCampaignHtml(content)

      expect(html).toContain('https://bubbleboomstore.com')
      expect(html).not.toContain('bubbleboom.com')
      expect(html).not.toContain('bubble-boom.vercel.app')
    })
  })

  // =========================================================================
  // 3. EMAIL CONTENT FLEXIBILITY
  // =========================================================================
  describe('3. Email Content Flexibility', () => {
    it('supports photo-only promotional email without crashing', () => {
      const content: CampaignContent = {
        hero_image_url: 'https://bubbleboomstore.com/images/banner.jpg',
        hero_image_alt: 'Visual Lookbook Banner',
        show_cta: false,
      }

      const html = generateCampaignHtml(content)

      expect(html).toContain('https://bubbleboomstore.com/images/banner.jpg')
      expect(html).toContain('Visual Lookbook Banner')
      // Still maintains brand header and footer
      expect(html).toContain('BUBBLE BOOM')
      expect(html).toContain(OFFICIAL_WEBSITE_URL)
      expect(html).toContain('unsubscribe')
    })

    it('supports text-only email without hero banner', () => {
      const content: CampaignContent = {
        heading: 'IMPORTANT STORE NOTICE',
        subheading: 'CUSTOMER UPDATE',
        body_text: 'We are expanding our delivery zones across India.',
        show_cta: false,
      }

      const html = generateCampaignHtml(content)

      expect(html).toContain('IMPORTANT STORE NOTICE')
      expect(html).toContain('CUSTOMER UPDATE')
      expect(html).toContain('We are expanding our delivery zones across India.')
      expect(html).not.toContain('<img src=""')
    })

    it('supports photo + text + secondary blocks', () => {
      const content: CampaignContent = {
        heading: 'THE WINTER CAPSULE',
        body_text: 'Full release notes below.',
        hero_image_url: 'https://bubbleboomstore.com/hero.jpg',
        show_cta: false,
        secondary_blocks: [
          {
            title: 'HEAVYWEIGHT FLEECE',
            text: '450 GSM custom knit cotton.',
          },
        ],
      }

      const html = generateCampaignHtml(content)

      expect(html).toContain('THE WINTER CAPSULE')
      expect(html).toContain('https://bubbleboomstore.com/hero.jpg')
      expect(html).toContain('HEAVYWEIGHT FLEECE')
      expect(html).toContain('450 GSM custom knit cotton.')
    })
  })

  // =========================================================================
  // 4. UNSUBSCRIBE & AUDIENCE SAFETY
  // =========================================================================
  describe('4. Unsubscribe & Opt-Out Mechanism', () => {
    it('provides custom unsubscribe URL with recipient parameter', () => {
      const content: CampaignContent = {
        body_text: 'Marketing broadcast.',
        show_cta: false,
      }

      const html = generateCampaignHtml(content, {
        recipientEmail: 'testuser@example.com',
        unsubscribeUrl: `${OFFICIAL_WEBSITE_URL}/unsubscribe?email=testuser%40example.com`,
      })

      expect(html).toContain('testuser@example.com opted in')
      expect(html).toContain(`${OFFICIAL_WEBSITE_URL}/unsubscribe?email=testuser%40example.com`)
    })

    it('rejects invalid or empty email in unsubscribe API', async () => {
      const req = new NextRequest('http://localhost:3000/api/marketing/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      })

      const res = await unsubscribePost(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Valid email')
    })

    it('accepts valid email in unsubscribe API and returns success', async () => {
      const req = new NextRequest('http://localhost:3000/api/marketing/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'subscriber@example.com' }),
      })

      const res = await unsubscribePost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('subscriber@example.com')
    })
  })
})
