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
    it('defaults show_cta to false across all preset templates', () => {
      const corePresets = [
        'coming_soon',
        'first_drop',
        'new_collection',
        'exclusive_offer',
        'back_in_stock',
        'custom_blank',
      ] as const

      for (const key of corePresets) {
        const preset = CAMPAIGN_PRESET_TEMPLATES[key]
        expect(preset, `Preset ${key} should exist`).toBeDefined()
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

  // =========================================================================
  // 5. 6 STREETWEAR PRESET TEMPLATES
  // =========================================================================
  describe('5. Streetwear Preset Templates Specification', () => {
    const requiredPresets = [
      'coming_soon',
      'first_drop',
      'new_collection',
      'exclusive_offer',
      'back_in_stock',
      'custom_blank',
    ] as const

    it('contains all 6 required preset templates with valid metadata', () => {
      for (const id of requiredPresets) {
        const preset = CAMPAIGN_PRESET_TEMPLATES[id]
        expect(preset).toBeDefined()
        expect(preset.name).toBeTruthy()
        expect(preset.description).toBeTruthy()
        expect(preset.defaultSubject).toBeTruthy()
        expect(preset.defaultPreheader).toBeTruthy()
        expect(preset.defaultContent).toBeDefined()
      }
    })

    it('generates valid HTML with mandatory website link for every preset template', () => {
      for (const id of requiredPresets) {
        const preset = CAMPAIGN_PRESET_TEMPLATES[id]
        const html = generateCampaignHtml(preset.defaultContent, {
          subject: preset.defaultSubject,
          preheader: preset.defaultPreheader,
        })
        expect(html).toContain('BUBBLE BOOM')
        expect(html).toContain(OFFICIAL_WEBSITE_URL)
        expect(html).toContain('BUBBLEBOOMSTORE.COM &rarr;')
      }
    })
  })

  // =========================================================================
  // 6. TYPOGRAPHY, ALIGNMENT & COLOR CUSTOMIZATION
  // =========================================================================
  describe('6. Design Studio Typography & Color Customization', () => {
    it('applies left, center, and right text alignment correctly', () => {
      const leftContent: CampaignContent = {
        heading: 'LEFT ALIGNED',
        body_text: 'Left aligned paragraph.',
        text_alignment: 'left',
        show_cta: false,
      }
      const leftHtml = generateCampaignHtml(leftContent)
      expect(leftHtml).toContain('text-align: left')

      const centerContent: CampaignContent = {
        heading: 'CENTER ALIGNED',
        body_text: 'Center aligned paragraph.',
        text_alignment: 'center',
        show_cta: false,
      }
      const centerHtml = generateCampaignHtml(centerContent)
      expect(centerHtml).toContain('text-align: center')

      const rightContent: CampaignContent = {
        heading: 'RIGHT ALIGNED',
        body_text: 'Right aligned paragraph.',
        text_alignment: 'right',
        show_cta: false,
      }
      const rightHtml = generateCampaignHtml(rightContent)
      expect(rightHtml).toContain('text-align: right')
    })

    it('applies custom text color and card background color', () => {
      const customContent: CampaignContent = {
        heading: 'CUSTOM COLOR TEST',
        body_text: 'Custom colored text content.',
        text_color: '#4a4a4a',
        card_background_color: '#fdfbf7',
        show_cta: false,
      }

      const html = generateCampaignHtml(customContent)
      expect(html).toContain('color: #4a4a4a')
      expect(html).toContain('background-color: #fdfbf7')
    })

    it('applies CTA alignment and button styling when CTA is enabled', () => {
      const ctaContent: CampaignContent = {
        heading: 'CTA TEST',
        show_cta: true,
        cta_text: 'ORDER TODAY',
        cta_url: 'https://bubbleboomstore.com/shop',
        cta_alignment: 'left',
        cta_style: 'custom',
        cta_bg_color: '#111827',
        cta_text_color: '#f9fafb',
      }

      const html = generateCampaignHtml(ctaContent)
      expect(html).toContain('ORDER TODAY')
      expect(html).toContain('background-color: #111827')
      expect(html).toContain('color: #f9fafb')
      expect(html).toContain('text-align: left')
    })
  })
})
