import { StoreSocialSettings } from '@/types/settings'

export function cleanWhatsAppNumber(number?: string | null): string {
  if (!number) return ''
  return number.replace(/\D/g, '')
}

export function isWhatsAppSupportActive(social?: Partial<StoreSocialSettings> | null): boolean {
  if (!social) return false
  if (!social.whatsapp_support_enabled) return false
  const digits = cleanWhatsAppNumber(social.whatsapp_number)
  return digits.length >= 10
}

export function buildWhatsAppUrl(
  rawNumber?: string | null,
  message?: string | null
): string | null {
  const digits = cleanWhatsAppNumber(rawNumber)
  if (digits.length < 10) return null

  const encodedMsg = message ? `?text=${encodeURIComponent(message.trim())}` : ''
  return `https://wa.me/${digits}${encodedMsg}`
}
