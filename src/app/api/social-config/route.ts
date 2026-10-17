import { NextResponse } from 'next/server'
import { getSocialSettings, cleanWhatsAppNumber, isWhatsAppSupportActive } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const social = await getSocialSettings()
    const isWaActive = isWhatsAppSupportActive(social)
    const cleanedNumber = isWaActive ? cleanWhatsAppNumber(social.whatsapp_number) : ''

    return NextResponse.json({
      instagram_url: social.instagram_url || 'https://www.instagram.com/bubbleboomstore/',
      instagram_handle: social.instagram_handle || '@bubbleboomstore',
      instagram_enabled: social.instagram_enabled ?? true,
      whatsapp_support_enabled: isWaActive,
      whatsapp_number: cleanedNumber,
      whatsapp_greeting: social.whatsapp_greeting || 'Hi Bubble Boom, I need help with my order or a product.',
    })
  } catch {
    return NextResponse.json({
      instagram_url: 'https://www.instagram.com/bubbleboomstore/',
      instagram_handle: '@bubbleboomstore',
      instagram_enabled: true,
      whatsapp_support_enabled: false,
      whatsapp_number: '',
      whatsapp_greeting: 'Hi Bubble Boom, I need help with my order or a product.',
    })
  }
}
