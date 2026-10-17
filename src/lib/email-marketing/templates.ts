import { CampaignContent, CampaignTemplateId } from './types'

export const OFFICIAL_WEBSITE_URL = 'https://bubbleboomstore.com'
export const DEFAULT_SENDER_NAME = 'Bubble Boom'
export const DEFAULT_SUPPORT_EMAIL = 'bubbleboomstore2026@gmail.com'

export interface RenderEmailOptions {
  campaignName?: string
  subject?: string
  preheader?: string
  senderName?: string
  unsubscribeUrl?: string
  recipientEmail?: string
}

export interface PresetTemplate {
  id: CampaignTemplateId
  name: string
  description: string
  defaultSubject: string
  defaultPreheader: string
  defaultContent: CampaignContent
}

export const CAMPAIGN_PRESET_TEMPLATES: Record<CampaignTemplateId, PresetTemplate> = {
  drop_soon: {
    id: 'drop_soon',
    name: 'First Drop Coming Soon',
    description: 'Minimalist high-contrast streetwear announcement for upcoming limited drops.',
    defaultSubject: 'DROP 001 // INCOMING TRANSMISSION',
    defaultPreheader: 'Limited quantities. Once sold out, never re-stocked.',
    defaultContent: {
      heading: 'DROP 001 // SHADOW DIVISION',
      subheading: 'LIMITED RUN WORLDWIDE',
      body_text: 'Crafted from heavy 320 GSM French terry cotton. Engineered for an oversized architectural silhouette. The countdown has begun.',
      hero_image_url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1200&q=80',
      hero_image_alt: 'Bubble Boom Drop 001',
      show_cta: false,
      cta_text: 'EXPLORE THE DROP',
      cta_url: 'https://bubbleboomstore.com/shop',
      cta_style: 'black',
    },
  },
  new_collection: {
    id: 'new_collection',
    name: 'New Collection Launch',
    description: 'Showcase freshly arrived hoodies, oversized tees, and streetwear essentials.',
    defaultSubject: 'NEW ARRIVALS: THE MONOCHROME CAPSULE',
    defaultPreheader: 'Explore the newest silhouettes now live on Bubble Boom.',
    defaultContent: {
      heading: 'THE MONOCHROME CAPSULE',
      subheading: 'AUTUMN / WINTER EDITION',
      body_text: 'Pure silhouettes. Zero compromises. Discover the newest drop featuring premium heavyweight fabrics and bespoke tailored construction.',
      hero_image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
      hero_image_alt: 'New Collection Capsule',
      show_cta: false,
      cta_text: 'SHOP NEW ARRIVALS',
      cta_url: 'https://bubbleboomstore.com/shop',
      cta_style: 'black',
    },
  },
  exclusive_offer: {
    id: 'exclusive_offer',
    name: 'Exclusive VIP Offer',
    description: 'Reward loyal subscribers and members with a private discount code.',
    defaultSubject: 'INSIDER ACCESS // YOUR PRIVATE 15% OFF CODE',
    defaultPreheader: 'Use code BOOMVIP at checkout for exclusive savings.',
    defaultContent: {
      heading: 'INSIDER ACCESS GRANTED',
      subheading: 'EXCLUSIVE SUBSCRIBER PRIVILEGE',
      body_text: 'As an authentic member of the Bubble Boom circle, enjoy 15% off your next order. Enter promo code BOOMVIP at checkout.',
      hero_image_url: '',
      hero_image_alt: 'Exclusive Offer',
      show_cta: false,
      cta_text: 'CLAIM 15% DISCOUNT',
      cta_url: 'https://bubbleboomstore.com/shop',
      cta_style: 'black',
      secondary_blocks: [
        {
          title: 'PROMO CODE: BOOMVIP',
          text: 'Valid across all live footwear, hoodies, and cargo pants. One use per customer.',
        },
      ],
    },
  },
  back_in_stock: {
    id: 'back_in_stock',
    name: 'Back In Stock Alert',
    description: 'High-urgency restock notification for best-selling items.',
    defaultSubject: 'RESTOCKED // BESTSELLERS RETURN',
    defaultPreheader: 'Your favorites are back in limited quantities.',
    defaultContent: {
      heading: 'BESTSELLERS ARE BACK',
      subheading: 'RESTOCK ALERT // IMMEDIATE DISPATCH',
      body_text: 'The pieces that sold out in hours have been replenished in limited quantities. Grab yours before they vanish again.',
      hero_image_url: '',
      hero_image_alt: 'Restock Alert',
      show_cta: false,
      cta_text: 'GRAB YOUR SIZE',
      cta_url: 'https://bubbleboomstore.com/shop',
      cta_style: 'black',
    },
  },
  custom_blank: {
    id: 'custom_blank',
    name: 'Custom Blank Canvas',
    description: 'Complete freedom to combine photos, banners, custom headings, and text.',
    defaultSubject: 'MESSAGE FROM BUBBLE BOOM',
    defaultPreheader: 'An announcement from the studio.',
    defaultContent: {
      heading: '',
      subheading: '',
      body_text: 'Enter your custom marketing announcement or promotional message here.',
      hero_image_url: '',
      hero_image_alt: '',
      show_cta: false,
      cta_text: 'VISIT STORE',
      cta_url: 'https://bubbleboomstore.com',
      cta_style: 'black',
    },
  },
}

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(str?: string | null): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generates an email-safe responsive HTML marketing template.
 *
 * Requirements:
 * 1. Optional CTA Button:
 *    - If `content.show_cta` is true and valid text/url exist, renders button.
 *    - If `content.show_cta` is false (default), CTA button is completely omitted. No empty space or placeholder.
 * 2. Mandatory Official Website Link:
 *    - Always includes https://bubbleboomstore.com in the footer.
 *    - Clickable hyperlink, clearly visible on desktop and mobile.
 *    - Never omitted whether CTA is ON or OFF.
 * 3. Content Flexibility:
 *    - Supports text-only, photo-only, or photo + text combinations.
 *    - Clean typography and streetwear monochrome aesthetic.
 */
export function generateCampaignHtml(
  content: CampaignContent,
  options: RenderEmailOptions = {}
): string {
  const preheaderText = options.preheader || ''
  const unsubscribeUrl = options.unsubscribeUrl || `${OFFICIAL_WEBSITE_URL}/unsubscribe`
  const recipientEmail = options.recipientEmail ? escapeHtml(options.recipientEmail) : ''

  // Optional CTA Button Markup
  let ctaHtml = ''
  if (content.show_cta && content.cta_text && content.cta_text.trim()) {
    const rawUrl = (content.cta_url || OFFICIAL_WEBSITE_URL).trim()
    const safeUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`
    const btnText = escapeHtml(content.cta_text.trim())

    let btnBg = '#000000'
    let btnColor = '#ffffff'
    let btnBorder = '2px solid #000000'

    if (content.cta_style === 'white') {
      btnBg = '#ffffff'
      btnColor = '#000000'
      btnBorder = '2px solid #000000'
    } else if (content.cta_style === 'outline') {
      btnBg = '#000000'
      btnColor = '#ffffff'
      btnBorder = '2px solid #ffffff'
    }

    ctaHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px auto 0 auto; text-align: center;">
        <tr>
          <td align="center">
            <a href="${escapeHtml(safeUrl)}" target="_blank" style="display: inline-block; background-color: ${btnBg}; color: ${btnColor}; border: ${btnBorder}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 0px; text-align: center; mso-padding-alt: 0;">
              <!--[if mso]><i style="letter-spacing: 25px; mso-font-width: -100%;" hidden>&nbsp;</i><![endif]-->
              <span style="mso-text-raise: 10pt;">${btnText}</span>
              <!--[if mso]><i style="letter-spacing: 25px;" hidden>&nbsp;</i><![endif]-->
            </a>
          </td>
        </tr>
      </table>
    `
  }

  // Hero Image Markup
  let heroImageHtml = ''
  if (content.hero_image_url && content.hero_image_url.trim()) {
    const cleanImgUrl = content.hero_image_url.trim()
    const altText = escapeHtml(content.hero_image_alt || 'Bubble Boom')
    heroImageHtml = `
      <tr>
        <td align="center" style="padding: 0; background-color: #000000;">
          <img src="${escapeHtml(cleanImgUrl)}" alt="${altText}" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0; outline: none; text-decoration: none;" />
        </td>
      </tr>
    `
  }

  // Heading & Subheading Markup
  let headingHtml = ''
  const hasSubheading = Boolean(content.subheading && content.subheading.trim())
  const hasHeading = Boolean(content.heading && content.heading.trim())

  if (hasSubheading || hasHeading) {
    headingHtml = `
      <div style="margin-bottom: 20px; text-align: center;">
        ${
          hasSubheading
            ? `<div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; letter-spacing: 3px; font-weight: bold; color: #737373; text-transform: uppercase; margin-bottom: 8px;">
                ${escapeHtml(content.subheading?.trim())}
              </div>`
            : ''
        }
        ${
          hasHeading
            ? `<h1 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 24px; line-height: 1.25; font-weight: 900; letter-spacing: -0.5px; color: #000000; text-transform: uppercase;">
                ${escapeHtml(content.heading?.trim())}
              </h1>`
            : ''
        }
      </div>
    `
  }

  // Body Text Markup (support multiple paragraphs if newline present)
  let bodyHtml = ''
  if (content.body_text && content.body_text.trim()) {
    const paragraphs = content.body_text.trim().split(/\n\s*\n/)
    bodyHtml = paragraphs
      .map(
        (p) =>
          `<p style="margin: 0 0 16px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #262626;">${escapeHtml(
            p
          ).replace(/\n/g, '<br />')}</p>`
      )
      .join('')
  }

  // Secondary Blocks Markup
  let secondaryHtml = ''
  if (content.secondary_blocks && content.secondary_blocks.length > 0) {
    const blocksMarkup = content.secondary_blocks
      .map((block) => {
        const titleMarkup = block.title
          ? `<div style="font-family: 'Courier New', Courier, monospace; font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #000000; margin-bottom: 6px;">${escapeHtml(
              block.title
            )}</div>`
          : ''
        const textMarkup = block.text
          ? `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #525252;">${escapeHtml(
              block.text
            )}</div>`
          : ''
        const imgMarkup = block.image_url
          ? `<img src="${escapeHtml(
              block.image_url
            )}" alt="Bubble Boom Feature" style="width: 100%; max-width: 520px; height: auto; display: block; margin: 10px 0; border: 0;" />`
          : ''
        return `
          <div style="background-color: #fafafa; border: 1px solid #e5e5e5; padding: 18px; margin-top: 16px; text-align: left;">
            ${titleMarkup}
            ${imgMarkup}
            ${textMarkup}
          </div>
        `
      })
      .join('')
    secondaryHtml = `<div style="margin-top: 20px;">${blocksMarkup}</div>`
  }

  // Check if content body has any text or secondary blocks
  const hasTextContent = Boolean(headingHtml || bodyHtml || secondaryHtml || ctaHtml)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(options.subject || 'Bubble Boom Announcement')}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <!-- Hidden Preheader -->
  ${
    preheaderText
      ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #f4f4f5;">
          ${escapeHtml(preheaderText)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>`
      : ''
  }

  <!-- Main Container -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 2px solid #000000; box-shadow: 6px 6px 0px 0px rgba(0,0,0,1);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td align="center" style="padding: 24px 20px; background-color: #000000; border-bottom: 2px solid #000000;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${OFFICIAL_WEBSITE_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 900; letter-spacing: 5px; color: #ffffff; text-transform: uppercase;">
                        BUBBLE BOOM
                      </span>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 4px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 10px; letter-spacing: 3px; color: #a3a3a3; text-transform: uppercase;">
                      OFFICIAL APPAREL // NEW DELHI
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO BANNER IMAGE (IF PROVIDED) -->
          ${heroImageHtml}

          <!-- CONTENT BODY -->
          ${
            hasTextContent
              ? `<tr>
                  <td style="padding: 32px 28px 24px 28px; background-color: #ffffff;">
                    ${headingHtml}
                    ${bodyHtml}
                    ${secondaryHtml}
                    ${ctaHtml}
                  </td>
                </tr>`
              : ''
          }

          <!-- MANDATORY WEBSITE BANNER / CALLOUT -->
          <tr>
            <td align="center" style="padding: 16px 20px; background-color: #fafafa; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-family: 'Courier New', Courier, monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #525252;">
                    EXPLORE THE FULL CATALOG ONLINE AT:
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 4px;">
                    <a href="${OFFICIAL_WEBSITE_URL}" target="_blank" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: #000000; text-decoration: underline;">
                      ${OFFICIAL_WEBSITE_URL}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 28px 24px; background-color: #000000; color: #a3a3a3; text-align: center;">
              
              <!-- OFFICIAL WEBSITE HYPERLINK IN FOOTER (ALWAYS REQUIRED) -->
              <div style="margin-bottom: 14px;">
                <a href="${OFFICIAL_WEBSITE_URL}" target="_blank" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-decoration: none; text-transform: uppercase;">
                  BUBBLEBOOMSTORE.COM &rarr;
                </a>
              </div>

              <!-- SENDER INFORMATION -->
              <p style="margin: 0 0 10px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #737373;">
                &copy; ${new Date().getFullYear()} BUBBLE BOOM. All Rights Reserved.<br />
                Official Streetwear &amp; Oversized Apparel.<br />
                Contact: <a href="mailto:${DEFAULT_SUPPORT_EMAIL}" style="color: #a3a3a3; text-decoration: underline;">${DEFAULT_SUPPORT_EMAIL}</a>
              </p>

              <!-- UNSUBSCRIBE & PREFERENCES -->
              <p style="margin: 12px 0 0 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; line-height: 1.5; color: #525252;">
                ${
                  recipientEmail
                    ? `You received this email because ${recipientEmail} opted in to Bubble Boom marketing communications.<br />`
                    : `You received this email because you opted in to Bubble Boom marketing communications.<br />`
                }
                To unsubscribe immediately or change email preferences, <a href="${escapeHtml(
                  unsubscribeUrl
                )}" target="_blank" style="color: #ffffff; text-decoration: underline; font-weight: bold;">click here to unsubscribe</a>.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
